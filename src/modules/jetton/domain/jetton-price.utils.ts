import type { JettonRateQuote } from "@/modules/jetton/domain/jetton-rates.types";
import type { TokenRates } from "@/shared/infrastructure/api/tonapi";
import type { Prisma } from "@/shared/infrastructure/api/prisma-client";

export interface JettonPriceRow {
  priceUsd: Prisma.Decimal | null;
  priceTon: Prisma.Decimal | null;
  diff24hUsd: string | null;
}

function decimalToPositiveNumber(value: Prisma.Decimal | null): number | null {
  if (value === null) {
    return null;
  }

  const numeric = value.toNumber();
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function mapTokenRatesToQuote(entry: TokenRates | undefined): JettonRateQuote {
  if (!entry?.prices) {
    return { usd: null, ton: null, diff24hUsd: null };
  }

  const usd = entry.prices.USD ?? entry.prices.usd ?? null;
  const ton = entry.prices.TON ?? entry.prices.ton ?? null;

  return {
    usd: typeof usd === "number" && usd > 0 ? usd : null,
    ton: typeof ton === "number" && ton > 0 ? ton : null,
    diff24hUsd: entry.diff24h?.USD ?? entry.diff24h?.usd ?? null,
  };
}

export function mapJettonPriceRowToQuote(row: JettonPriceRow): JettonRateQuote | null {
  const usd = decimalToPositiveNumber(row.priceUsd);
  const ton = decimalToPositiveNumber(row.priceTon);

  if (usd === null && ton === null) {
    return null;
  }

  return {
    usd,
    ton,
    diff24hUsd: row.diff24hUsd,
  };
}

export function hasDisplayableJettonPrice(quote: JettonRateQuote | null | undefined): boolean {
  if (!quote) {
    return false;
  }

  return (quote.usd !== null && quote.usd > 0) || (quote.ton !== null && quote.ton > 0);
}
