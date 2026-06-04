import { Address } from "@ton/core";
import { mapJettonPriceRowToQuote, mapTokenRatesToQuote } from "@/modules/jetton/domain/jetton-price.utils";
import type { JettonRateQuote } from "@/modules/jetton/domain/jetton-rates.types";
import type { TokenRates } from "@/shared/infrastructure/api/tonapi";
import { TONAPI_CLIENT } from "@/shared/infrastructure/api/tonapi-client";
import { prisma } from "@/shared/infrastructure/api/prisma";
import type { Prisma } from "@/shared/infrastructure/api/prisma-client";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";

/** TonAPI free tier ~1 RPS — one `getRates` per second. */
const TONAPI_RATES_MIN_INTERVAL_MS = 1100;
const RATES_BATCH_SIZE = 100;
const PRICE_TTL_MS = 15 * 60 * 1000;
const RATES_CURRENCIES = ["usd", "ton"] as const;

let lastTonapiRatesRequestAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function throttleTonapiRates(): Promise<void> {
  const now = Date.now();
  const waitMs = lastTonapiRatesRequestAt + TONAPI_RATES_MIN_INTERVAL_MS - now;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  lastTonapiRatesRequestAt = Date.now();
}

function toRatesTokenParam(address: string): string {
  return Address.parse(address).toString();
}

function findRateEntry(rates: Record<string, TokenRates>, address: string): TokenRates | undefined {
  const rawKey = toRawTonAddress(address).toLowerCase();

  for (const [tokenKey, entry] of Object.entries(rates)) {
    try {
      if (toRawTonAddress(tokenKey).toLowerCase() === rawKey) {
        return entry;
      }
    } catch {
      if (tokenKey.toLowerCase() === rawKey) {
        return entry;
      }
    }
  }

  const friendly = toRatesTokenParam(address);
  return rates[friendly] ?? rates[friendly.toUpperCase()];
}

function buildPriceUpdateData(entry: TokenRates): Prisma.ChainJettonUpdateInput {
  const quote = mapTokenRatesToQuote(entry);
  const hasPrice = quote.usd !== null || quote.ton !== null;

  return {
    priceUsd: quote.usd,
    priceTon: quote.ton,
    diff24hUsd: entry.diff24h?.USD ?? entry.diff24h?.usd ?? null,
    diff7dUsd: entry.diff7d?.USD ?? entry.diff7d?.usd ?? null,
    diff30dUsd: entry.diff30d?.USD ?? entry.diff30d?.usd ?? null,
    priceUpdatedAt: hasPrice ? new Date() : null,
  };
}

async function fetchTonapiRatesBatch(tokenParams: string[]): Promise<Record<string, TokenRates>> {
  if (tokenParams.length === 0) {
    return {};
  }

  await throttleTonapiRates();

  const response = await TONAPI_CLIENT.getRates({
    tokens: tokenParams,
    currencies: [...RATES_CURRENCIES],
  });

  return response.rates ?? {};
}

async function persistRatesForAddresses(addresses: string[], rates: Record<string, TokenRates>): Promise<void> {
  await Promise.all(
    addresses.map(async address => {
      const entry = findRateEntry(rates, address);
      if (!entry) {
        return;
      }

      await prisma.chainJetton.updateMany({
        where: { address: toRawTonAddress(address) },
        data: buildPriceUpdateData(entry),
      });
    })
  );
}

/**
 * Loads cached jetton prices from `chain_jetton`.
 */
export async function loadJettonRatesFromDb(addresses: string[]): Promise<Record<string, JettonRateQuote>> {
  const uniqueAddresses = [...new Set(addresses.map(addr => toRawTonAddress(addr)))];

  if (uniqueAddresses.length === 0) {
    return {};
  }

  const rows = await prisma.chainJetton.findMany({
    where: { address: { in: uniqueAddresses } },
    select: {
      address: true,
      priceUsd: true,
      priceTon: true,
      diff24hUsd: true,
    },
  });

  const result: Record<string, JettonRateQuote> = {};

  for (const row of rows) {
    const quote = mapJettonPriceRowToQuote(row);
    if (!quote) {
      continue;
    }

    result[row.address.toLowerCase()] = quote;
  }

  return result;
}

/**
 * Refreshes stale/missing prices via TonAPI (rate-limited) and writes to DB.
 */
export async function refreshStaleJettonPrices(addresses: string[]): Promise<void> {
  const uniqueAddresses = [...new Set(addresses.map(addr => toRawTonAddress(addr)))];

  if (uniqueAddresses.length === 0) {
    return;
  }

  const staleBefore = new Date(Date.now() - PRICE_TTL_MS);

  const rows = await prisma.chainJetton.findMany({
    where: {
      address: { in: uniqueAddresses },
      OR: [{ priceUpdatedAt: null }, { priceUpdatedAt: { lt: staleBefore } }],
    },
    select: { address: true },
  });

  const staleAddresses = rows.map(row => row.address);
  if (staleAddresses.length === 0) {
    return;
  }

  for (let offset = 0; offset < staleAddresses.length; offset += RATES_BATCH_SIZE) {
    const batch = staleAddresses.slice(offset, offset + RATES_BATCH_SIZE);
    const tokenParams = batch.map(toRatesTokenParam);
    const rates = await fetchTonapiRatesBatch(tokenParams);
    await persistRatesForAddresses(batch, rates);
  }
}

/**
 * DB-first rates; refreshes stale jettons from TonAPI (1 RPS) then returns cache.
 */
export async function getJettonRatesWithCache(addresses: string[]): Promise<Record<string, JettonRateQuote>> {
  await refreshStaleJettonPrices(addresses);
  return loadJettonRatesFromDb(addresses);
}
