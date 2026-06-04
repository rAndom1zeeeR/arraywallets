import { formatJettonFromRaw, formatTonFromNanoton } from "@/features/sync-events/lib/ton-amount.utils";
import {
  buildSwapPnlSummary,
  resolveUsdtDecimals,
  type AssetPnlFormatted,
  type JettonPnlLine,
  type SwapPnlSummary,
} from "@/features/sync-events/lib/swap-pnl.utils";
import type { SwapActionSnapshot, WalletSwapAggregate } from "@/features/sync-events/lib/swap-stats.utils";
import { prisma } from "@/shared/api/prisma";
import { ChainActionStatus, ChainActionType, ChainWalletPnlAssetKind, type Prisma } from "@/shared/api/prisma-client";
import { getWalletAddressVariants, toRawTonAddress } from "@/shared/lib/ton-address";

const TON_ASSET_KEY = "ton";
const USDT_ASSET_KEY = "usdt";
const DEFAULT_USDT_DECIMALS = 6;

type ChainWalletPnlRow = Prisma.ChainWalletPnlGetPayload<{
  include: {
    jetton: { select: { address: true; symbol: true; name: true; decimals: true } };
  };
}>;

function bigintToDecimal(value: bigint): string {
  return value.toString();
}

function decimalToBigint(value: Prisma.Decimal): bigint {
  return BigInt(value.toFixed(0));
}

function formatUsdtFromRow(raw: bigint, decimals: number): string {
  return formatJettonFromRaw(raw, decimals, "USDT");
}

function buildAssetPnlFromRow(
  row: ChainWalletPnlRow,
  formatSpent: (raw: bigint) => string,
  formatReceived: (raw: bigint) => string,
  formatNet: (raw: bigint) => string
): AssetPnlFormatted {
  const spentRaw = decimalToBigint(row.spentRaw);
  const receivedRaw = decimalToBigint(row.receivedRaw);
  const netRaw = decimalToBigint(row.netRaw);

  return {
    spentRaw,
    receivedRaw,
    netRaw,
    spent: formatSpent(spentRaw),
    received: formatReceived(receivedRaw),
    net: formatNet(netRaw),
  };
}

function mapRowsToSwapPnlSummary(rows: ChainWalletPnlRow[]): SwapPnlSummary | null {
  if (rows.length === 0) {
    return null;
  }

  const tonRow = rows.find(row => row.assetKey === TON_ASSET_KEY);

  if (!tonRow) {
    return null;
  }

  const usdtRow = rows.find(row => row.assetKey === USDT_ASSET_KEY);
  const usdtDecimals = usdtRow?.decimals ?? DEFAULT_USDT_DECIMALS;

  const ton = buildAssetPnlFromRow(tonRow, formatTonFromNanoton, formatTonFromNanoton, formatTonFromNanoton);

  const usdt = usdtRow
    ? buildAssetPnlFromRow(
        usdtRow,
        raw => formatUsdtFromRow(raw, usdtDecimals),
        raw => formatUsdtFromRow(raw, usdtDecimals),
        raw => formatUsdtFromRow(raw, usdtDecimals)
      )
    : {
        spentRaw: 0n,
        receivedRaw: 0n,
        netRaw: 0n,
        spent: formatUsdtFromRow(0n, usdtDecimals),
        received: formatUsdtFromRow(0n, usdtDecimals),
        net: formatUsdtFromRow(0n, usdtDecimals),
      };

  const jettonLines: JettonPnlLine[] = rows
    .filter(row => row.assetKind === ChainWalletPnlAssetKind.JETTON && row.jetton)
    .map(row => {
      const jetton = row.jetton!;
      const spentRaw = decimalToBigint(row.spentRaw);
      const receivedRaw = decimalToBigint(row.receivedRaw);
      const netRaw = decimalToBigint(row.netRaw);

      return {
        jetton: {
          address: jetton.address,
          symbol: jetton.symbol,
          name: jetton.name,
          decimals: jetton.decimals,
        },
        spent: formatJettonFromRaw(spentRaw, jetton.decimals, jetton.symbol),
        received: formatJettonFromRaw(receivedRaw, jetton.decimals, jetton.symbol),
        net: formatJettonFromRaw(netRaw, jetton.decimals, jetton.symbol),
        spentRaw,
        receivedRaw,
        netRaw,
      };
    })
    .sort((a, b) => {
      const absA = a.netRaw < 0n ? -a.netRaw : a.netRaw;
      const absB = b.netRaw < 0n ? -b.netRaw : b.netRaw;
      if (absA !== absB) {
        return absA > absB ? -1 : 1;
      }
      return a.jetton.symbol.localeCompare(b.jetton.symbol);
    });

  return { ton, usdt, jettonLines };
}

async function resolveJettonIdsByAddress(addresses: string[]): Promise<Map<string, string>> {
  if (addresses.length === 0) {
    return new Map();
  }

  const jettons = await prisma.chainJetton.findMany({
    where: { address: { in: addresses } },
    select: { id: true, address: true },
  });

  return new Map(jettons.map(row => [row.address.toLowerCase(), row.id]));
}

/**
 * Replaces materialized PnL rows for a wallet from a computed summary.
 */
export async function persistWalletPnl(
  walletAddress: string,
  pnl: SwapPnlSummary,
  swapCount: number,
  usdtDecimals: number
): Promise<void> {
  const normalized = toRawTonAddress(walletAddress);
  const jettonAddresses = pnl.jettonLines.map(line => line.jetton.address);
  const jettonIdByAddress = await resolveJettonIdsByAddress(jettonAddresses);
  const computedAt = new Date();

  const hasUsdtActivity = pnl.usdt.spentRaw > 0n || pnl.usdt.receivedRaw > 0n;

  const rows: Prisma.ChainWalletPnlCreateManyInput[] = [
    {
      walletAddress: normalized,
      assetKind: ChainWalletPnlAssetKind.TON,
      assetKey: TON_ASSET_KEY,
      spentRaw: bigintToDecimal(pnl.ton.spentRaw),
      receivedRaw: bigintToDecimal(pnl.ton.receivedRaw),
      netRaw: bigintToDecimal(pnl.ton.netRaw),
      swapCount,
      computedAt,
    },
    {
      walletAddress: normalized,
      assetKind: ChainWalletPnlAssetKind.USDT,
      assetKey: USDT_ASSET_KEY,
      decimals: hasUsdtActivity ? usdtDecimals : null,
      spentRaw: bigintToDecimal(pnl.usdt.spentRaw),
      receivedRaw: bigintToDecimal(pnl.usdt.receivedRaw),
      netRaw: bigintToDecimal(pnl.usdt.netRaw),
      swapCount: 0,
      computedAt,
    },
    ...pnl.jettonLines.map(line => ({
      walletAddress: normalized,
      assetKind: ChainWalletPnlAssetKind.JETTON,
      assetKey: line.jetton.address.toLowerCase(),
      jettonId: jettonIdByAddress.get(line.jetton.address.toLowerCase()) ?? null,
      decimals: line.jetton.decimals,
      spentRaw: bigintToDecimal(line.spentRaw),
      receivedRaw: bigintToDecimal(line.receivedRaw),
      netRaw: bigintToDecimal(line.netRaw),
      swapCount: 0,
      computedAt,
    })),
  ];

  await prisma.$transaction([
    prisma.chainWalletPnl.deleteMany({ where: { walletAddress: normalized } }),
    prisma.chainWalletPnl.createMany({ data: rows }),
  ]);
}

/**
 * Loads materialized swap PnL for a wallet. Returns null when not computed yet.
 */
export async function loadWalletPnlFromDb(walletAddress: string): Promise<SwapPnlSummary | null> {
  const normalized = toRawTonAddress(walletAddress);

  const rows = await prisma.chainWalletPnl.findMany({
    where: { walletAddress: normalized },
    include: {
      jetton: {
        select: { address: true, symbol: true, name: true, decimals: true },
      },
    },
    orderBy: { assetKey: "asc" },
  });

  return mapRowsToSwapPnlSummary(rows);
}

/**
 * Returns stored swap count from materialized TON row, or null if missing.
 */
export async function getStoredWalletPnlSwapCount(walletAddress: string): Promise<number | null> {
  const normalized = toRawTonAddress(walletAddress);

  const tonRow = await prisma.chainWalletPnl.findUnique({
    where: {
      walletAddress_assetKey: {
        walletAddress: normalized,
        assetKey: TON_ASSET_KEY,
      },
    },
    select: { swapCount: true },
  });

  return tonRow?.swapCount ?? null;
}

export async function countWalletJettonSwaps(walletAddress: string): Promise<number> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  return prisma.chainAction.count({
    where: {
      walletAddress: { in: walletVariants },
      type: ChainActionType.JETTON_SWAP,
      status: ChainActionStatus.SUCCESS,
    },
  });
}

/**
 * Recomputes PnL from swap actions and persists rows in `chain_wallet_pnl`.
 */
export async function recomputeWalletPnl(
  walletAddress: string,
  aggregate: WalletSwapAggregate,
  swaps: SwapActionSnapshot[]
): Promise<SwapPnlSummary> {
  const pnl = buildSwapPnlSummary(aggregate, swaps);
  const usdtDecimals = resolveUsdtDecimals(swaps);

  await persistWalletPnl(walletAddress, pnl, aggregate.swapCount, usdtDecimals);

  return pnl;
}

/**
 * Deletes materialized PnL for a wallet (e.g. on force resync).
 */
export async function clearWalletPnl(walletAddress: string): Promise<number> {
  const normalized = toRawTonAddress(walletAddress);
  const result = await prisma.chainWalletPnl.deleteMany({
    where: { walletAddress: normalized },
  });

  return result.count;
}
