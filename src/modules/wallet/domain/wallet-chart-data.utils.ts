import { format } from "date-fns";
import type { JettonPortfolioPnlLine, PortfolioTradeDetail } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import type { TonTransferPnlItem } from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import type { AssetPnlFormatted } from "@/modules/swap/domain/swap-pnl.utils";
import type {
  SwapActionSnapshot,
  SwapDexBreakdown,
  WalletSwapAggregate,
} from "@/modules/swap/domain/swap-stats.utils";
import type { TonPnlWithTransfers } from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import { getEffectiveTonLegs } from "@/modules/swap/domain/wrapped-ton.utils";
import { coerceNanoton, nanotonToTonNumber } from "@/shared/lib/ton/ton-amount.utils";

export interface ChartNamedValue {
  /** Stable unique key (jetton address, date, dex name, etc.). */
  id: string;
  name: string;
  value: number;
  /** Tooltip unit label, e.g. `TON` or jetton symbol. */
  unit?: string;
  fill?: string;
}

export interface ChartTimePoint {
  date: string;
  label: string;
  value: number;
  cumulative: number;
}

export interface ChartFlowPoint {
  date: string;
  label: string;
  inflow: number;
  outflow: number;
}

export interface ChartWaterfallStep {
  id: string;
  name: string;
  value: number;
  runningTotal: number;
  isTotal?: boolean;
}

function namedValue(
  id: string,
  name: string,
  value: number,
  unit = "TON",
): ChartNamedValue {
  return { id, name, value, unit };
}

function shortJettonId(address: string): string {
  const normalized = address.replace(/^0:/, "");
  return normalized.length > 8 ? `${normalized.slice(0, 4)}…${normalized.slice(-4)}` : normalized;
}

/** Recharts uses `name` as React key — disambiguate duplicate jetton symbols. */
export function disambiguateJettonLabels<T extends { id: string; name: string }>(rows: T[]): T[] {
  const symbolCounts = new Map<string, number>();
  for (const row of rows) {
    symbolCounts.set(row.name, (symbolCounts.get(row.name) ?? 0) + 1);
  }

  return rows.map(row => {
    if ((symbolCounts.get(row.name) ?? 0) <= 1) {
      return row;
    }

    return { ...row, name: `${row.name} · ${shortJettonId(row.id)}` };
  });
}

function disambiguateJettonChartNames(rows: ChartNamedValue[]): ChartNamedValue[] {
  return disambiguateJettonLabels(rows);
}

interface TimedTonFlow {
  timestampMs: number;
  tonDelta: number;
}

function swapTonDelta(swap: SwapActionSnapshot): number {
  const { tonInNanoton, tonOutNanoton } = getEffectiveTonLegs(swap);
  return nanotonToTonNumber(tonOutNanoton - tonInNanoton);
}

function swapTonGrossVolume(swap: SwapActionSnapshot): number {
  const { tonInNanoton, tonOutNanoton } = getEffectiveTonLegs(swap);
  return nanotonToTonNumber(tonInNanoton + tonOutNanoton);
}

function toDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function toDayLabel(dayKey: string): string {
  return format(new Date(`${dayKey}T00:00:00`), "MMM d");
}

function sortSwapsChronologically(swaps: SwapActionSnapshot[]): SwapActionSnapshot[] {
  return [...swaps].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

function mergePortfolioLines(
  portfolio: JettonPortfolioPnlLine[],
  tonPortfolio: JettonPortfolioPnlLine | null,
): JettonPortfolioPnlLine[] {
  if (!tonPortfolio) {
    return portfolio;
  }

  const tonKey = tonPortfolio.jetton.address.toLowerCase();
  return [
    tonPortfolio,
    ...portfolio.filter(line => line.jetton.address.toLowerCase() !== tonKey),
  ];
}

function collectAllTrades(
  portfolio: JettonPortfolioPnlLine[],
  tonPortfolio: JettonPortfolioPnlLine | null,
): Array<PortfolioTradeDetail & { symbol: string }> {
  const rows: Array<PortfolioTradeDetail & { symbol: string }> = [];

  for (const line of mergePortfolioLines(portfolio, tonPortfolio)) {
    for (const trade of line.trades) {
      rows.push({ ...trade, symbol: line.jetton.symbol });
    }
  }

  return rows.sort(
    (a, b) => new Date(a.timestampIso).getTime() - new Date(b.timestampIso).getTime(),
  );
}

interface JettonCostState {
  costBasisTon: number;
  holdingsRaw: bigint;
}

/**
 * Replays portfolio trades to build cumulative realized PnL (TON) over time.
 */
export function buildCumulativeRealizedPnlSeries(
  portfolio: JettonPortfolioPnlLine[],
  tonPortfolio: JettonPortfolioPnlLine | null,
): ChartTimePoint[] {
  const trades = collectAllTrades(portfolio, tonPortfolio);
  const costByJetton = new Map<string, JettonCostState>();
  let cumulative = 0;
  const points: ChartTimePoint[] = [];

  for (const trade of trades) {
    const key = trade.symbol.toLowerCase();
    const state = costByJetton.get(key) ?? { costBasisTon: 0, holdingsRaw: 0n };
    const tonAmount = trade.totalTon ?? 0;

    if (trade.side === "buy" && tonAmount > 0) {
      state.costBasisTon += tonAmount;
      state.holdingsRaw += trade.jettonAmountRaw;
    }

    if (trade.side === "sell" && trade.jettonAmountRaw > 0n) {
      const holdingsBefore = state.holdingsRaw;
      const sellRaw = trade.jettonAmountRaw;
      const coveredRaw = holdingsBefore > 0n && sellRaw > holdingsBefore ? holdingsBefore : sellRaw;
      const coveredRatio =
        holdingsBefore > 0n && coveredRaw > 0n
          ? Number(coveredRaw) / Number(holdingsBefore)
          : 0;
      const soldCost = state.costBasisTon * coveredRatio;
      const coveredProceeds =
        tonAmount > 0 && sellRaw > 0n
          ? (tonAmount * Number(coveredRaw)) / Number(sellRaw)
          : 0;
      const excessProceeds = tonAmount > 0 ? tonAmount - coveredProceeds : 0;

      cumulative += coveredProceeds - soldCost + excessProceeds;
      state.costBasisTon = Math.max(0, state.costBasisTon - soldCost);
      state.holdingsRaw =
        holdingsBefore > coveredRaw ? holdingsBefore - coveredRaw : 0n;
    }

    costByJetton.set(key, state);

    const dayKey = toDayKey(new Date(trade.timestampIso));
    const last = points[points.length - 1];

    if (last?.date === dayKey) {
      last.cumulative = cumulative;
      last.value = cumulative;
    } else {
      points.push({
        date: dayKey,
        label: toDayLabel(dayKey),
        value: cumulative,
        cumulative,
      });
    }
  }

  return points;
}

/** Cumulative net TON from swaps (received − spent). */
export function buildCumulativeSwapTonNetSeries(swaps: SwapActionSnapshot[]): ChartTimePoint[] {
  const sorted = sortSwapsChronologically(swaps);
  let cumulative = 0;
  const points: ChartTimePoint[] = [];

  for (const swap of sorted) {
    cumulative += swapTonDelta(swap);
    const dayKey = toDayKey(swap.timestamp);

    const last = points[points.length - 1];
    if (last?.date === dayKey) {
      last.cumulative = cumulative;
      last.value = cumulative;
    } else {
      points.push({
        date: dayKey,
        label: toDayLabel(dayKey),
        value: cumulative,
        cumulative,
      });
    }
  }

  return points;
}

/** Cumulative TON including swaps and pure transfers. */
export function buildCumulativeEquityFlowSeries(
  swaps: SwapActionSnapshot[],
  transfers: TonTransferPnlItem[],
): ChartTimePoint[] {
  const flows: TimedTonFlow[] = [
    ...swaps.map(swap => ({
      timestampMs: swap.timestamp.getTime(),
      tonDelta: swapTonDelta(swap),
    })),
    ...transfers.map(item => ({
      timestampMs: new Date(item.timestampIso).getTime(),
      tonDelta: item.direction === "INCOMING" ? item.amountTon : -item.amountTon,
    })),
  ].sort((a, b) => a.timestampMs - b.timestampMs);

  let cumulative = 0;
  const points: ChartTimePoint[] = [];

  for (const flow of flows) {
    cumulative += flow.tonDelta;
    const dayKey = toDayKey(new Date(flow.timestampMs));
    const last = points[points.length - 1];

    if (last?.date === dayKey) {
      last.cumulative = cumulative;
      last.value = cumulative;
    } else {
      points.push({
        date: dayKey,
        label: toDayLabel(dayKey),
        value: cumulative,
        cumulative,
      });
    }
  }

  return points;
}

export function buildProfitByJettonSeries(
  portfolio: JettonPortfolioPnlLine[],
  tonPortfolio: JettonPortfolioPnlLine | null,
): ChartNamedValue[] {
  const rows: ChartNamedValue[] = [];

  if (tonPortfolio) {
    const profit = tonPortfolio.currentProfitTon ?? tonPortfolio.realizedProfitTon;
    if (profit !== 0) {
      rows.push(
        namedValue(tonPortfolio.jetton.address, tonPortfolio.jetton.symbol, profit),
      );
    }
  }

  for (const line of portfolio) {
    if (tonPortfolio && line.jetton.address === tonPortfolio.jetton.address) {
      continue;
    }

    const profit = line.currentProfitTon ?? line.realizedProfitTon;
    if (profit === 0) {
      continue;
    }

    rows.push(namedValue(line.jetton.address, line.jetton.symbol, profit));
  }

  return disambiguateJettonChartNames(rows.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)));
}

export function buildPortfolioAllocationSeries(
  portfolio: JettonPortfolioPnlLine[],
  tonPortfolio: JettonPortfolioPnlLine | null,
): ChartNamedValue[] {
  const rows: ChartNamedValue[] = [];

  const addLine = (line: JettonPortfolioPnlLine) => {
    const value = line.holdingsValueTon ?? 0;
    if (value <= 0) {
      return;
    }

    rows.push(namedValue(line.jetton.address, line.jetton.symbol, value));
  };

  if (tonPortfolio) {
    addLine(tonPortfolio);
  }

  for (const line of portfolio) {
    if (tonPortfolio && line.jetton.address === tonPortfolio.jetton.address) {
      continue;
    }
    addLine(line);
  }

  return disambiguateJettonChartNames(rows.sort((a, b) => b.value - a.value));
}

export function buildTonWaterfallSeries(
  flowPnl: AssetPnlFormatted,
  tonPnlWithTransfers: TonPnlWithTransfers,
): ChartWaterfallStep[] {
  const swapNet = nanotonToTonNumber(flowPnl.netRaw);
  const withdrawn = -tonPnlWithTransfers.withdrawnTon;
  const deposited = tonPnlWithTransfers.depositedTon;
  const onWallet = tonPnlWithTransfers.onWalletTon;

  let running = 0;
  const steps: ChartWaterfallStep[] = [];

  const pushStep = (id: string, name: string, value: number, isTotal = false) => {
    if (!isTotal) {
      running += value;
    }

    steps.push({
      id,
      name,
      value,
      runningTotal: isTotal ? onWallet : running,
      isTotal,
    });
  };

  pushStep("swap-net", "Swap net", swapNet);
  pushStep("withdrawn", "Withdrawn", withdrawn);
  pushStep("deposited", "Deposited", deposited);
  pushStep("on-wallet", "On wallet", onWallet, true);

  return steps;
}

export function buildDexDistributionSeries(byDex: SwapDexBreakdown[]): ChartNamedValue[] {
  return byDex
    .map(row => namedValue(row.dex, row.dex, row.count))
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function buildDexVolumeSeries(byDex: SwapDexBreakdown[]): ChartNamedValue[] {
  return byDex
    .map(row =>
      namedValue(
        row.dex,
        row.dex,
        nanotonToTonNumber(row.tonInNanoton + row.tonOutNanoton),
      ),
    )
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function buildSwapLegKindSeries(swaps: SwapActionSnapshot[]): ChartNamedValue[] {
  const counts = new Map<string, number>();

  for (const swap of swaps) {
    const key = swap.legKind;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, value]) => namedValue(name, name, value))
    .sort((a, b) => b.value - a.value);
}

export function buildSwapActionTypeSeries(swaps: SwapActionSnapshot[]): ChartNamedValue[] {
  const counts = new Map<string, number>();

  for (const swap of swaps) {
    const key = swap.isInferred ? "INFERRED_SWAP" : swap.actionType;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, value]) => namedValue(name, name, value))
    .sort((a, b) => b.value - a.value);
}

export function buildSwapActivityCountSeries(swaps: SwapActionSnapshot[]): ChartNamedValue[] {
  const counts = new Map<string, number>();

  for (const swap of swaps) {
    const dayKey = toDayKey(swap.timestamp);
    counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => namedValue(date, toDayLabel(date), value));
}

export function buildSwapActivityVolumeSeries(swaps: SwapActionSnapshot[]): ChartNamedValue[] {
  const volumes = new Map<string, number>();

  for (const swap of swaps) {
    const dayKey = toDayKey(swap.timestamp);
    volumes.set(dayKey, (volumes.get(dayKey) ?? 0) + swapTonGrossVolume(swap));
  }

  return [...volumes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => namedValue(date, toDayLabel(date), value));
}

export function buildInflowOutflowSeries(
  swaps: SwapActionSnapshot[],
  transfers: TonTransferPnlItem[],
): ChartFlowPoint[] {
  const buckets = new Map<string, ChartFlowPoint>();

  const ensureBucket = (dayKey: string): ChartFlowPoint => {
    const existing = buckets.get(dayKey);
    if (existing) {
      return existing;
    }

    const point: ChartFlowPoint = {
      date: dayKey,
      label: toDayLabel(dayKey),
      inflow: 0,
      outflow: 0,
    };
    buckets.set(dayKey, point);
    return point;
  };

  for (const swap of swaps) {
    const dayKey = toDayKey(swap.timestamp);
    const bucket = ensureBucket(dayKey);
    const { tonInNanoton, tonOutNanoton } = getEffectiveTonLegs(swap);
    bucket.inflow += nanotonToTonNumber(tonOutNanoton);
    bucket.outflow += nanotonToTonNumber(tonInNanoton);
  }

  for (const item of transfers) {
    const dayKey = toDayKey(new Date(item.timestampIso));
    const bucket = ensureBucket(dayKey);
    if (item.direction === "INCOMING") {
      bucket.inflow += item.amountTon;
    } else {
      bucket.outflow += item.amountTon;
    }
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildJettonTonVolumeSeries(aggregate: WalletSwapAggregate): ChartNamedValue[] {
  const rows = aggregate.byJetton
    .map(row =>
      namedValue(
        row.jetton.address,
        row.jetton.symbol,
        nanotonToTonNumber(
          coerceNanoton(row.tonPaidNanoton) + coerceNanoton(row.tonReceivedNanoton),
        ),
        "TON",
      ),
    )
    .filter(row => row.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  return disambiguateJettonChartNames(rows);
}

export function buildJettonNetTonSeries(aggregate: WalletSwapAggregate): ChartNamedValue[] {
  const rows = aggregate.byJetton
    .map(row =>
      namedValue(
        row.jetton.address,
        row.jetton.symbol,
        nanotonToTonNumber(
          coerceNanoton(row.tonReceivedNanoton) - coerceNanoton(row.tonPaidNanoton),
        ),
        "TON",
      ),
    )
    .filter(row => row.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 12);

  return disambiguateJettonChartNames(rows);
}

export function formatChartTon(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} TON`;
}
