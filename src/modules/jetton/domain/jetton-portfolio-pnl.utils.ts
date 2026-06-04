import { formatJettonFromRaw, formatTonFromNanoton } from "@/shared/lib/ton/ton-amount.utils";
import {
  formatPercentRatio,
  formatTonAmount,
  formatTonPrice,
  formatTonUsdPair,
  formatUsd,
  formatUsdUnitPrice,
} from "@/modules/jetton/domain/money-format.utils";
import { isUsdtLikeJetton } from "@/modules/swap/domain/swap-pnl.utils";
import { isPtonLikeJetton, getEffectiveTonLegs } from "@/modules/swap/domain/wrapped-ton.utils";
import { extractDexFeeNanoton } from "@/modules/swap/domain/swap-fee.utils";
import type {
  JettonSwapBreakdownFormatted,
  SwapActionSnapshot,
  SwapJettonRef,
} from "@/modules/swap/domain/swap-stats.utils";
import { parseNanoton } from "@/shared/lib/ton/ton-amount.utils";

const NANOTON_PER_TON = 1_000_000_000n;

export type PortfolioPriceUnit = "usd" | "ton" | "none";
export type PortfolioTradeSide = "buy" | "sell";

export interface PortfolioPaymentLeg {
  label: string;
  ton: number | null;
  tonFormatted: string | null;
  usd: number | null;
  usdFormatted: string | null;
}

export interface PortfolioTradeDetail {
  swapId: string;
  tonEventId: string;
  timestampIso: string;
  side: PortfolioTradeSide;
  jettonAmount: string;
  jettonAmountRaw: bigint;
  unitPriceUsd: number | null;
  unitPriceTon: number | null;
  unitPriceDisplay: string | null;
  totalTon: number | null;
  totalTonFormatted: string | null;
  totalUsd: number | null;
  totalUsdFormatted: string | null;
  paymentLegs: PortfolioPaymentLeg[];
  dex: string | null;
  legKind: string;
  incompleteTon: boolean;
  incompleteUsd: boolean;
}

export const TON_PORTFOLIO_ASSET_KEY = "native-ton";

export interface JettonPortfolioPnlLine {
  jetton: SwapJettonRef;
  isTonNative?: boolean;
  holdingsRaw: bigint;
  holdings: string;
  totalInvestedTon: number;
  totalInvestedUsd: number;
  totalInvested: string | null;
  totalProceedsTon: number;
  totalProceedsUsd: number;
  avgBuyPriceUsd: number | null;
  avgBuyPriceTon: number | null;
  avgBuyPrice: string | null;
  avgPriceUnit: PortfolioPriceUnit;
  currentPriceUsd: number | null;
  currentPriceTon: number | null;
  currentPrice: string | null;
  currentPriceUnit: PortfolioPriceUnit;
  holdingsValueTon: number | null;
  holdingsValueUsd: number | null;
  holdingsValue: string | null;
  unrealizedProfitTon: number | null;
  unrealizedProfitUsd: number | null;
  realizedProfitTon: number;
  realizedProfitUsd: number;
  currentProfitTon: number | null;
  currentProfitUsd: number | null;
  currentProfitPercentTon: number | null;
  currentProfitPercentUsd: number | null;
  currentProfit: string | null;
  currentProfitPercentText: string | null;
  hasIncompleteTonBasis: boolean;
  hasIncompleteUsdBasis: boolean;
  trades: PortfolioTradeDetail[];
}

export interface PortfolioPnlTotals {
  totalInvestedTon: number;
  totalInvestedUsd: number;
  totalHoldingsValueTon: number;
  totalHoldingsValueUsd: number;
  totalCurrentProfitTon: number;
  totalCurrentProfitUsd: number;
  hasIncompleteTon: boolean;
  hasIncompleteUsd: boolean;
}

/** @deprecated Use PortfolioPnlTotals */
export type PortfolioPnlTotalsUsd = PortfolioPnlTotals;

interface JettonAccumulator {
  jetton: SwapJettonRef;
  costBasisTon: number;
  costBasisUsd: number;
  totalInvestedTon: number;
  totalInvestedUsd: number;
  totalProceedsTon: number;
  totalProceedsUsd: number;
  totalBoughtRaw: bigint;
  totalSoldRaw: bigint;
  realizedProfitTon: number;
  realizedProfitUsd: number;
  missingCostTonEvents: number;
  missingCostUsdEvents: number;
  missingProceedsTonEvents: number;
  missingProceedsUsdEvents: number;
  trades: PortfolioTradeDetail[];
}

function rawToHuman(raw: bigint, decimals: number): number {
  if (raw === 0n) {
    return 0;
  }

  return Number(raw) / 10 ** decimals;
}

function nanotonToTon(nanoton: bigint): number {
  return Number(nanoton) / Number(NANOTON_PER_TON);
}

function jettonRawUsdValue(raw: bigint, jetton: SwapJettonRef, unitPriceUsd: number | null): number | null {
  if (unitPriceUsd === null) {
    return null;
  }

  return rawToHuman(raw, jetton.decimals) * unitPriceUsd;
}

function usdtRawToUsd(raw: bigint, decimals: number): number {
  return rawToHuman(raw, decimals);
}

function getJettonSpotUsd(jetton: SwapJettonRef): number | null {
  const usd = jetton.price?.usd;
  return usd !== null && usd !== undefined && usd > 0 ? usd : null;
}

function getJettonSpotTon(jetton: SwapJettonRef): number | null {
  const ton = jetton.price?.ton;
  return ton !== null && ton !== undefined && ton > 0 ? ton : null;
}

function isSameJetton(a: SwapJettonRef, b: SwapJettonRef): boolean {
  return a.address.toLowerCase() === b.address.toLowerCase();
}

function resolveJettonLegUsd(
  jetton: SwapJettonRef,
  amountRaw: bigint,
  timestampSec: number,
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): number | null {
  if (amountRaw <= 0n) {
    return null;
  }

  if (isUsdtLikeJetton(jetton)) {
    return usdtRawToUsd(amountRaw, jetton.decimals);
  }

  const jettonUsd = getJettonUsdAt(jetton, timestampSec);
  return jettonRawUsdValue(amountRaw, jetton, jettonUsd);
}

interface LegSumResult {
  totalTon: number;
  totalUsd: number;
  legs: PortfolioPaymentLeg[];
  incompleteTon: boolean;
  incompleteUsd: boolean;
}

/**
 * Sums payment legs: TON in native TON, USDT/jetton with USD price in USD (no TON→USD conversion).
 */
function sumPaidLegsForSwap(
  swap: SwapActionSnapshot,
  excludeJettonAddress: string | null,
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): LegSumResult {
  const ts = Math.floor(swap.timestamp.getTime() / 1000);
  const legs: PortfolioPaymentLeg[] = [];
  let totalTon = 0;
  let totalUsd = 0;
  let hasTon = false;
  let hasUsd = false;
  const incompleteTon = false;
  let incompleteUsd = false;

  const { tonInNanoton: effectiveTonIn } = getEffectiveTonLegs(swap);
  const dexFeeNanoton = extractDexFeeNanoton(
    swap.dexFeeNanoton !== null ? { feeTonNanoton: swap.dexFeeNanoton } : null
  );

  if (effectiveTonIn > 0n) {
    const ton = nanotonToTon(effectiveTonIn);
    totalTon += ton;
    hasTon = true;

    const baseTonIn = parseNanoton(swap.tonIn);
    if (dexFeeNanoton > 0n && baseTonIn > 0n && effectiveTonIn > baseTonIn) {
      legs.push({
        label: `TON paid (${formatTonFromNanoton(baseTonIn)})`,
        ton: nanotonToTon(baseTonIn),
        tonFormatted: formatTonAmount(nanotonToTon(baseTonIn)),
        usd: null,
        usdFormatted: null,
      });
      legs.push({
        label: `DEX fee (${formatTonFromNanoton(dexFeeNanoton)})`,
        ton: nanotonToTon(dexFeeNanoton),
        tonFormatted: formatTonAmount(nanotonToTon(dexFeeNanoton)),
        usd: null,
        usdFormatted: null,
      });
    } else {
      legs.push({
        label: `TON paid (${formatTonFromNanoton(effectiveTonIn)})`,
        ton,
        tonFormatted: formatTonAmount(ton),
        usd: null,
        usdFormatted: null,
      });
    }
  }

  const amountIn = parseNanoton(swap.amountIn);
  if (swap.jettonIn && amountIn > 0n) {
    const excluded =
      excludeJettonAddress !== null && swap.jettonIn.address.toLowerCase() === excludeJettonAddress.toLowerCase();

    if (!excluded && !isPtonLikeJetton(swap.jettonIn)) {
      const amountLabel = formatJettonFromRaw(amountIn, swap.jettonIn.decimals, swap.jettonIn.symbol);
      const usd = resolveJettonLegUsd(swap.jettonIn, amountIn, ts, getJettonUsdAt);

      if (usd === null) {
        incompleteUsd = true;
        legs.push({
          label: `${amountLabel} paid`,
          ton: null,
          tonFormatted: null,
          usd: null,
          usdFormatted: null,
        });
      } else {
        totalUsd += usd;
        hasUsd = true;
        legs.push({
          label: `${amountLabel} paid`,
          ton: null,
          tonFormatted: null,
          usd,
          usdFormatted: formatUsd(usd),
        });
      }
    }
  }

  if (!hasTon && !hasUsd) {
    return { totalTon: 0, totalUsd: 0, legs, incompleteTon: true, incompleteUsd: true };
  }

  return { totalTon, totalUsd, legs, incompleteTon, incompleteUsd };
}

/**
 * Sums proceeds legs: TON in native TON, USDT/jetton with USD price in USD.
 */
function sumProceedsLegsForSwap(
  swap: SwapActionSnapshot,
  excludeJettonAddress: string | null,
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): LegSumResult {
  const ts = Math.floor(swap.timestamp.getTime() / 1000);
  const legs: PortfolioPaymentLeg[] = [];
  let totalTon = 0;
  let totalUsd = 0;
  let hasTon = false;
  let hasUsd = false;
  const incompleteTon = false;
  let incompleteUsd = false;

  const { tonOutNanoton: effectiveTonOut } = getEffectiveTonLegs(swap);
  const dexFeeNanoton = extractDexFeeNanoton(
    swap.dexFeeNanoton !== null ? { feeTonNanoton: swap.dexFeeNanoton } : null
  );
  const baseTonOut = parseNanoton(swap.tonOut);

  if (effectiveTonOut > 0n) {
    const ton = nanotonToTon(effectiveTonOut);
    totalTon += ton;
    hasTon = true;

    if (dexFeeNanoton > 0n && baseTonOut > 0n && baseTonOut > effectiveTonOut) {
      legs.push({
        label: `TON received (${formatTonFromNanoton(baseTonOut)})`,
        ton: nanotonToTon(baseTonOut),
        tonFormatted: formatTonAmount(nanotonToTon(baseTonOut)),
        usd: null,
        usdFormatted: null,
      });
      legs.push({
        label: `DEX fee (${formatTonFromNanoton(dexFeeNanoton)})`,
        ton: -nanotonToTon(dexFeeNanoton),
        tonFormatted: `-${formatTonAmount(nanotonToTon(dexFeeNanoton))}`,
        usd: null,
        usdFormatted: null,
      });
    } else {
      legs.push({
        label: `TON received (${formatTonFromNanoton(effectiveTonOut)})`,
        ton,
        tonFormatted: formatTonAmount(ton),
        usd: null,
        usdFormatted: null,
      });
    }
  }

  const amountOut = parseNanoton(swap.amountOut);
  if (swap.jettonOut && amountOut > 0n) {
    const excluded =
      excludeJettonAddress !== null && swap.jettonOut.address.toLowerCase() === excludeJettonAddress.toLowerCase();

    if (!excluded && !isPtonLikeJetton(swap.jettonOut)) {
      const amountLabel = formatJettonFromRaw(amountOut, swap.jettonOut.decimals, swap.jettonOut.symbol);
      const usd = resolveJettonLegUsd(swap.jettonOut, amountOut, ts, getJettonUsdAt);

      if (usd === null) {
        incompleteUsd = true;
        legs.push({
          label: `${amountLabel} received`,
          ton: null,
          tonFormatted: null,
          usd: null,
          usdFormatted: null,
        });
      } else {
        totalUsd += usd;
        hasUsd = true;
        legs.push({
          label: `${amountLabel} received`,
          ton: null,
          tonFormatted: null,
          usd,
          usdFormatted: formatUsd(usd),
        });
      }
    }
  }

  if (!hasTon && !hasUsd) {
    return { totalTon: 0, totalUsd: 0, legs, incompleteTon: true, incompleteUsd: true };
  }

  return { totalTon, totalUsd, legs, incompleteTon, incompleteUsd };
}

function buildTradeUnitPrices(
  totalTon: number,
  totalUsd: number,
  amountRaw: bigint,
  decimals: number
): {
  unitPriceUsd: number | null;
  unitPriceTon: number | null;
  unitPriceDisplay: string | null;
} {
  if (amountRaw <= 0n) {
    return { unitPriceUsd: null, unitPriceTon: null, unitPriceDisplay: null };
  }

  const units = rawToHuman(amountRaw, decimals);
  if (units <= 0) {
    return { unitPriceUsd: null, unitPriceTon: null, unitPriceDisplay: null };
  }

  const unitPriceUsd = totalUsd > 0 ? totalUsd / units : null;
  const unitPriceTon = totalTon > 0 ? totalTon / units : null;

  const parts: string[] = [];
  const usdText = unitPriceUsd !== null ? formatUsdUnitPrice(unitPriceUsd) : null;
  const tonText = unitPriceTon !== null ? formatTonPrice(unitPriceTon) : null;

  if (usdText) {
    parts.push(usdText);
  }
  if (tonText) {
    parts.push(tonText);
  }

  return {
    unitPriceUsd,
    unitPriceTon,
    unitPriceDisplay: parts.length > 0 ? parts.join(" · ") : null,
  };
}

function ensureAccumulator(map: Map<string, JettonAccumulator>, jetton: SwapJettonRef): JettonAccumulator {
  const key = jetton.address.toLowerCase();
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const created: JettonAccumulator = {
    jetton,
    costBasisTon: 0,
    costBasisUsd: 0,
    totalInvestedTon: 0,
    totalInvestedUsd: 0,
    totalProceedsTon: 0,
    totalProceedsUsd: 0,
    totalBoughtRaw: 0n,
    totalSoldRaw: 0n,
    realizedProfitTon: 0,
    realizedProfitUsd: 0,
    missingCostTonEvents: 0,
    missingCostUsdEvents: 0,
    missingProceedsTonEvents: 0,
    missingProceedsUsdEvents: 0,
    trades: [],
  };
  map.set(key, created);
  return created;
}

function applyBuy(state: JettonAccumulator, swap: SwapActionSnapshot, amountRaw: bigint, paid: LegSumResult): void {
  if (amountRaw <= 0n) {
    return;
  }

  const { unitPriceUsd, unitPriceTon, unitPriceDisplay } = buildTradeUnitPrices(
    paid.totalTon,
    paid.totalUsd,
    amountRaw,
    state.jetton.decimals
  );

  const hasTonCost = paid.totalTon > 0;
  const hasUsdCost = paid.totalUsd > 0;

  state.trades.push({
    swapId: swap.id,
    tonEventId: swap.tonEventId,
    timestampIso: swap.timestamp.toISOString(),
    side: "buy",
    jettonAmount: formatJettonFromRaw(amountRaw, state.jetton.decimals, state.jetton.symbol),
    jettonAmountRaw: amountRaw,
    unitPriceUsd,
    unitPriceTon,
    unitPriceDisplay,
    totalTon: hasTonCost ? paid.totalTon : null,
    totalTonFormatted: hasTonCost ? formatTonAmount(paid.totalTon) : null,
    totalUsd: hasUsdCost ? paid.totalUsd : null,
    totalUsdFormatted: hasUsdCost ? formatUsd(paid.totalUsd) : null,
    paymentLegs: paid.legs,
    dex: swap.dex,
    legKind: swap.legKind,
    incompleteTon: paid.incompleteTon,
    incompleteUsd: paid.incompleteUsd,
  });

  state.totalBoughtRaw += amountRaw;

  if (!hasTonCost && !hasUsdCost) {
    if (paid.incompleteTon) {
      state.missingCostTonEvents += 1;
    }
    if (paid.incompleteUsd) {
      state.missingCostUsdEvents += 1;
    }
    return;
  }

  if (hasTonCost) {
    state.totalInvestedTon += paid.totalTon;
    state.costBasisTon += paid.totalTon;
  }

  if (hasUsdCost) {
    state.totalInvestedUsd += paid.totalUsd;
    state.costBasisUsd += paid.totalUsd;
  }
}

function splitProceedsByAmount(total: number, partRaw: bigint, wholeRaw: bigint): number {
  if (total <= 0 || partRaw <= 0n || wholeRaw <= 0n) {
    return 0;
  }

  return (total * Number(partRaw)) / Number(wholeRaw);
}

interface SellAllocation {
  coveredAmountRaw: bigint;
  excessAmountRaw: bigint;
}

/** Splits a sell into the portion covered by tracked holdings vs unknown-source excess. */
function resolveSellAllocation(amountRaw: bigint, holdingsBefore: bigint): SellAllocation {
  if (holdingsBefore <= 0n) {
    return { coveredAmountRaw: 0n, excessAmountRaw: amountRaw };
  }

  if (amountRaw <= holdingsBefore) {
    return { coveredAmountRaw: amountRaw, excessAmountRaw: 0n };
  }

  return {
    coveredAmountRaw: holdingsBefore,
    excessAmountRaw: amountRaw - holdingsBefore,
  };
}

function applySellCostAndProceeds(
  state: JettonAccumulator,
  amountRaw: bigint,
  holdingsBefore: bigint,
  proceeds: LegSumResult
): void {
  const { coveredAmountRaw, excessAmountRaw } = resolveSellAllocation(amountRaw, holdingsBefore);
  const hasTonProceeds = proceeds.totalTon > 0;
  const hasUsdProceeds = proceeds.totalUsd > 0;

  if (!hasTonProceeds && !hasUsdProceeds) {
    if (proceeds.incompleteTon) {
      state.missingProceedsTonEvents += 1;
    }
    if (proceeds.incompleteUsd) {
      state.missingProceedsUsdEvents += 1;
    }

    if (coveredAmountRaw > 0n && holdingsBefore > 0n) {
      const costRatio = Number(coveredAmountRaw) / Number(holdingsBefore);
      state.costBasisTon = Math.max(0, state.costBasisTon * (1 - costRatio));
      state.costBasisUsd = Math.max(0, state.costBasisUsd * (1 - costRatio));
    }

    if (excessAmountRaw > 0n) {
      state.missingCostTonEvents += 1;
    }

    return;
  }

  if (hasTonProceeds) {
    state.totalProceedsTon += proceeds.totalTon;
  }
  if (hasUsdProceeds) {
    state.totalProceedsUsd += proceeds.totalUsd;
  }

  if (coveredAmountRaw > 0n && holdingsBefore > 0n) {
    const costRatio = Number(coveredAmountRaw) / Number(holdingsBefore);
    const soldCostTon = state.costBasisTon * costRatio;
    const soldCostUsd = state.costBasisUsd * costRatio;
    const coveredTonProceeds = splitProceedsByAmount(proceeds.totalTon, coveredAmountRaw, amountRaw);
    const coveredUsdProceeds = splitProceedsByAmount(proceeds.totalUsd, coveredAmountRaw, amountRaw);

    if (hasTonProceeds) {
      state.realizedProfitTon += coveredTonProceeds - soldCostTon;
      state.costBasisTon = Math.max(0, state.costBasisTon - soldCostTon);
    }

    if (hasUsdProceeds) {
      state.realizedProfitUsd += coveredUsdProceeds - soldCostUsd;
      state.costBasisUsd = Math.max(0, state.costBasisUsd - soldCostUsd);
    }
  }

  if (excessAmountRaw > 0n) {
    state.missingCostTonEvents += 1;

    const excessTonProceeds = splitProceedsByAmount(proceeds.totalTon, excessAmountRaw, amountRaw);
    const excessUsdProceeds = splitProceedsByAmount(proceeds.totalUsd, excessAmountRaw, amountRaw);

    if (hasTonProceeds && excessTonProceeds > 0) {
      state.realizedProfitTon += excessTonProceeds;
    }

    if (hasUsdProceeds && excessUsdProceeds > 0) {
      state.realizedProfitUsd += excessUsdProceeds;
    }
  }
}

function applySell(
  state: JettonAccumulator,
  swap: SwapActionSnapshot,
  amountRaw: bigint,
  proceeds: LegSumResult
): void {
  if (amountRaw <= 0n) {
    return;
  }

  const holdingsBefore = state.totalBoughtRaw - state.totalSoldRaw;
  const { unitPriceUsd, unitPriceTon, unitPriceDisplay } = buildTradeUnitPrices(
    proceeds.totalTon,
    proceeds.totalUsd,
    amountRaw,
    state.jetton.decimals
  );

  const hasTonProceeds = proceeds.totalTon > 0;
  const hasUsdProceeds = proceeds.totalUsd > 0;

  state.trades.push({
    swapId: swap.id,
    tonEventId: swap.tonEventId,
    timestampIso: swap.timestamp.toISOString(),
    side: "sell",
    jettonAmount: formatJettonFromRaw(amountRaw, state.jetton.decimals, state.jetton.symbol),
    jettonAmountRaw: amountRaw,
    unitPriceUsd,
    unitPriceTon,
    unitPriceDisplay,
    totalTon: hasTonProceeds ? proceeds.totalTon : null,
    totalTonFormatted: hasTonProceeds ? formatTonAmount(proceeds.totalTon) : null,
    totalUsd: hasUsdProceeds ? proceeds.totalUsd : null,
    totalUsdFormatted: hasUsdProceeds ? formatUsd(proceeds.totalUsd) : null,
    paymentLegs: proceeds.legs,
    dex: swap.dex,
    legKind: swap.legKind,
    incompleteTon: proceeds.incompleteTon,
    incompleteUsd: proceeds.incompleteUsd,
  });

  state.totalSoldRaw += amountRaw;

  const { excessAmountRaw } = resolveSellAllocation(amountRaw, holdingsBefore);
  applySellCostAndProceeds(state, amountRaw, holdingsBefore, proceeds);

  if (excessAmountRaw > 0n) {
    const lastTrade = state.trades[state.trades.length - 1];
    if (lastTrade) {
      lastTrade.incompleteTon = true;
      lastTrade.incompleteUsd = true;
    }
  }
}

interface ResolvedJettonLeg {
  jetton: SwapJettonRef;
  amountRaw: bigint;
}

/**
 * Jetton received when user pays TON (`tonIn` > 0).
 */
function resolveTonPaidJettonReceive(swap: SwapActionSnapshot): ResolvedJettonLeg | null {
  const tonIn = parseNanoton(swap.tonIn);
  if (tonIn <= 0n || swap.legKind === "jetton_ton") {
    return null;
  }

  const amountIn = parseNanoton(swap.amountIn);
  const amountOut = parseNanoton(swap.amountOut);
  const jetton = swap.jettonOut ?? swap.jettonIn;

  if (!jetton || isUsdtLikeJetton(jetton) || isPtonLikeJetton(jetton)) {
    return null;
  }

  const amountRaw = swap.jettonOut && amountOut > 0n ? amountOut : amountIn;
  return amountRaw > 0n ? { jetton, amountRaw } : null;
}

/**
 * Resolves jetton buy leg — TON→jetton, jetton→jetton, legacy `jettonIn`+`tonIn` rows.
 */
function resolveJettonBuyLeg(swap: SwapActionSnapshot): ResolvedJettonLeg | null {
  const tonIn = parseNanoton(swap.tonIn);
  const amountIn = parseNanoton(swap.amountIn);
  const amountOut = parseNanoton(swap.amountOut);

  const sameJetton = swap.jettonIn && swap.jettonOut && isSameJetton(swap.jettonIn, swap.jettonOut);
  if (sameJetton) {
    return null;
  }

  if (swap.legKind === "jetton_ton" || swap.legKind === "ton_ton") {
    return null;
  }

  if (tonIn > 0n) {
    const tonPaidReceive = resolveTonPaidJettonReceive(swap);
    if (tonPaidReceive) {
      return tonPaidReceive;
    }
  }

  if (swap.legKind === "ton_jetton") {
    const jetton = swap.jettonOut ?? swap.jettonIn;
    if (!jetton || isUsdtLikeJetton(jetton) || isPtonLikeJetton(jetton)) {
      return null;
    }
    const amountRaw = amountOut > 0n ? amountOut : amountIn;
    return amountRaw > 0n ? { jetton, amountRaw } : null;
  }

  if (swap.jettonOut && amountOut > 0n) {
    if (isUsdtLikeJetton(swap.jettonOut) || isPtonLikeJetton(swap.jettonOut)) {
      return null;
    }
    return { jetton: swap.jettonOut, amountRaw: amountOut };
  }

  return null;
}

/**
 * Jetton sold when user receives TON (`tonOut` > 0).
 */
function resolveTonReceivedJettonSold(swap: SwapActionSnapshot): ResolvedJettonLeg | null {
  const tonOut = parseNanoton(swap.tonOut);
  if (tonOut <= 0n || swap.legKind === "ton_jetton") {
    return null;
  }

  const amountIn = parseNanoton(swap.amountIn);
  const amountOut = parseNanoton(swap.amountOut);
  const jetton = swap.jettonIn ?? swap.jettonOut;

  if (!jetton || isUsdtLikeJetton(jetton) || isPtonLikeJetton(jetton)) {
    return null;
  }

  const amountRaw = swap.jettonIn && amountIn > 0n ? amountIn : amountOut;
  return amountRaw > 0n ? { jetton, amountRaw } : null;
}

/**
 * Resolves jetton sell leg — jetton→TON and jetton→jetton.
 */
function resolveJettonSellLeg(swap: SwapActionSnapshot): ResolvedJettonLeg | null {
  const tonOut = parseNanoton(swap.tonOut);
  const amountIn = parseNanoton(swap.amountIn);
  const amountOut = parseNanoton(swap.amountOut);

  const sameJetton = swap.jettonIn && swap.jettonOut && isSameJetton(swap.jettonIn, swap.jettonOut);
  if (sameJetton) {
    return null;
  }

  if (swap.legKind === "ton_jetton" || swap.legKind === "ton_ton") {
    return null;
  }

  if (tonOut > 0n) {
    const tonReceivedSold = resolveTonReceivedJettonSold(swap);
    if (tonReceivedSold) {
      return tonReceivedSold;
    }
  }

  if (swap.legKind === "jetton_ton") {
    const jetton = swap.jettonIn ?? swap.jettonOut;
    if (!jetton || isUsdtLikeJetton(jetton) || isPtonLikeJetton(jetton)) {
      return null;
    }
    const amountRaw = amountIn > 0n ? amountIn : amountOut;
    return amountRaw > 0n ? { jetton, amountRaw } : null;
  }

  if (swap.jettonIn && amountIn > 0n) {
    if (isUsdtLikeJetton(swap.jettonIn) || isPtonLikeJetton(swap.jettonIn)) {
      return null;
    }
    return { jetton: swap.jettonIn, amountRaw: amountIn };
  }

  return null;
}

function mergeTonPaymentIntoTrade(trade: PortfolioTradeDetail, tonIn: bigint, jettonDecimals: number): number | null {
  const hasTonLeg = trade.paymentLegs.some(leg => leg.label.startsWith("TON paid"));
  if (hasTonLeg) {
    return null;
  }

  const ton = nanotonToTon(tonIn);
  const tonLeg: PortfolioPaymentLeg = {
    label: `TON paid (${formatTonFromNanoton(tonIn)})`,
    ton,
    tonFormatted: formatTonAmount(ton),
    usd: null,
    usdFormatted: null,
  };

  trade.paymentLegs = [tonLeg, ...trade.paymentLegs];
  trade.totalTon = (trade.totalTon ?? 0) + ton;
  trade.totalTonFormatted = formatTonAmount(trade.totalTon);
  trade.incompleteTon = false;

  const { unitPriceUsd, unitPriceTon, unitPriceDisplay } = buildTradeUnitPrices(
    trade.totalTon ?? 0,
    trade.totalUsd ?? 0,
    trade.jettonAmountRaw,
    jettonDecimals
  );
  trade.unitPriceUsd = unitPriceUsd;
  trade.unitPriceTon = unitPriceTon;
  trade.unitPriceDisplay = unitPriceDisplay;

  return ton;
}

/**
 * Adds missing TON→jetton buys and merges TON paid into existing jetton↔jetton buy rows.
 */
function ensureTonJettonTradesOnJettonLines(
  map: Map<string, JettonAccumulator>,
  swaps: SwapActionSnapshot[],
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): void {
  for (const swap of swaps) {
    const { tonInNanoton: tonIn } = getEffectiveTonLegs(swap);
    if (tonIn <= 0n) {
      continue;
    }

    const buyLeg = resolveTonPaidJettonReceive(swap);
    if (!buyLeg) {
      continue;
    }

    const state = ensureAccumulator(map, buyLeg.jetton);
    const existingTrade = state.trades.find(trade => trade.swapId === swap.id && trade.side === "buy");

    if (existingTrade) {
      const addedTon = mergeTonPaymentIntoTrade(existingTrade, tonIn, buyLeg.jetton.decimals);
      if (addedTon !== null) {
        state.totalInvestedTon += addedTon;
        state.costBasisTon += addedTon;
      }
      continue;
    }

    const paid = sumPaidLegsForSwap(swap, buyLeg.jetton.address, getJettonUsdAt);
    applyBuy(state, swap, buyLeg.amountRaw, paid);
  }
}

function processSwap(
  swap: SwapActionSnapshot,
  map: Map<string, JettonAccumulator>,
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): void {
  const buyLeg = resolveJettonBuyLeg(swap);
  if (buyLeg) {
    const state = ensureAccumulator(map, buyLeg.jetton);
    const paid = sumPaidLegsForSwap(swap, buyLeg.jetton.address, getJettonUsdAt);
    applyBuy(state, swap, buyLeg.amountRaw, paid);
  }

  const sellLeg = resolveJettonSellLeg(swap);
  if (sellLeg) {
    const state = ensureAccumulator(map, sellLeg.jetton);
    const proceeds = sumProceedsLegsForSwap(swap, sellLeg.jetton.address, getJettonUsdAt);
    applySell(state, swap, sellLeg.amountRaw, proceeds);
  }
}

function mapAccumulatorToLine(state: JettonAccumulator): JettonPortfolioPnlLine {
  const spotUsd = getJettonSpotUsd(state.jetton);
  const spotTon = getJettonSpotTon(state.jetton);
  const holdingsRaw = state.totalBoughtRaw - state.totalSoldRaw;
  const spotHoldingsRaw = holdingsRaw > 0n ? holdingsRaw : 0n;
  const holdingsHuman = rawToHuman(spotHoldingsRaw, state.jetton.decimals);

  const holdingsValueUsd =
    spotUsd !== null && spotHoldingsRaw > 0n ? holdingsHuman * spotUsd : spotHoldingsRaw === 0n ? 0 : null;
  const holdingsValueTon =
    spotTon !== null && spotHoldingsRaw > 0n ? holdingsHuman * spotTon : spotHoldingsRaw === 0n ? 0 : null;

  const unrealizedProfitUsd =
    spotHoldingsRaw > 0n && holdingsValueUsd !== null
      ? holdingsValueUsd - state.costBasisUsd
      : spotHoldingsRaw > 0n && state.costBasisUsd > 0
        ? null
        : 0;

  const unrealizedProfitTon =
    spotHoldingsRaw > 0n && holdingsValueTon !== null
      ? holdingsValueTon - state.costBasisTon
      : spotHoldingsRaw > 0n && state.costBasisTon > 0
        ? null
        : 0;

  const currentProfitUsd =
    unrealizedProfitUsd !== null || state.realizedProfitUsd !== 0
      ? state.realizedProfitUsd + (unrealizedProfitUsd ?? 0)
      : null;

  const currentProfitTon =
    unrealizedProfitTon !== null || state.realizedProfitTon !== 0
      ? state.realizedProfitTon + (unrealizedProfitTon ?? 0)
      : null;

  const currentProfitPercentUsd =
    currentProfitUsd !== null && state.totalInvestedUsd > 0 ? currentProfitUsd / state.totalInvestedUsd : null;

  const currentProfitPercentTon =
    currentProfitTon !== null && state.totalInvestedTon > 0 ? currentProfitTon / state.totalInvestedTon : null;

  let avgBuyPriceUsd: number | null = null;
  let avgBuyPriceTon: number | null = null;
  let avgPriceUnit: PortfolioPriceUnit = "none";

  if (spotHoldingsRaw > 0n) {
    if (state.costBasisUsd > 0) {
      avgBuyPriceUsd = state.costBasisUsd / holdingsHuman;
      avgPriceUnit = "usd";
    }
    if (state.costBasisTon > 0) {
      avgBuyPriceTon = state.costBasisTon / holdingsHuman;
      if (avgPriceUnit === "none") {
        avgPriceUnit = "ton";
      }
    }
  } else if (state.totalBoughtRaw > 0n) {
    const boughtHuman = rawToHuman(state.totalBoughtRaw, state.jetton.decimals);
    if (state.totalInvestedUsd > 0) {
      avgBuyPriceUsd = state.totalInvestedUsd / boughtHuman;
      avgPriceUnit = "usd";
    }
    if (state.totalInvestedTon > 0) {
      avgBuyPriceTon = state.totalInvestedTon / boughtHuman;
      if (avgPriceUnit === "none") {
        avgPriceUnit = "ton";
      }
    }
  }

  let currentPriceUnit: PortfolioPriceUnit = "none";
  let currentPrice: string | null = null;
  let currentPriceUsd: number | null = null;
  let currentPriceTon: number | null = null;

  if (spotUsd !== null && spotTon !== null) {
    currentPriceUsd = spotUsd;
    currentPriceTon = spotTon;
    currentPrice = `${formatUsd(spotUsd)} · ${formatTonPrice(spotTon)}`;
    currentPriceUnit = "usd";
  } else if (spotUsd !== null) {
    currentPriceUsd = spotUsd;
    currentPrice = formatUsd(spotUsd);
    currentPriceUnit = "usd";
  } else if (spotTon !== null) {
    currentPriceTon = spotTon;
    currentPrice = formatTonPrice(spotTon);
    currentPriceUnit = "ton";
  }

  const avgBuyPriceParts: string[] = [];
  const avgUsdText = avgBuyPriceUsd !== null ? formatUsdUnitPrice(avgBuyPriceUsd) : null;
  const avgTonText = avgBuyPriceTon !== null ? formatTonPrice(avgBuyPriceTon) : null;
  if (avgUsdText) {
    avgBuyPriceParts.push(avgUsdText);
  }
  if (avgTonText) {
    avgBuyPriceParts.push(avgTonText);
  }
  const avgBuyPrice = avgBuyPriceParts.length > 0 ? avgBuyPriceParts.join(" · ") : null;

  const profitPercentParts: string[] = [];
  const pctUsd = formatPercentRatio(currentProfitPercentUsd);
  const pctTon = formatPercentRatio(currentProfitPercentTon);
  if (pctUsd) {
    profitPercentParts.push(`${pctUsd} USD`);
  }
  if (pctTon) {
    profitPercentParts.push(`${pctTon} TON`);
  }

  const sortedTrades = [...state.trades].sort(
    (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
  );

  return {
    jetton: state.jetton,
    holdingsRaw: spotHoldingsRaw,
    holdings: formatJettonFromRaw(spotHoldingsRaw, state.jetton.decimals, state.jetton.symbol),
    totalInvestedTon: state.totalInvestedTon,
    totalInvestedUsd: state.totalInvestedUsd,
    totalInvested: formatTonUsdPair(
      state.totalInvestedTon > 0 ? state.totalInvestedTon : null,
      state.totalInvestedUsd > 0 ? state.totalInvestedUsd : null
    ),
    totalProceedsTon: state.totalProceedsTon,
    totalProceedsUsd: state.totalProceedsUsd,
    avgBuyPriceUsd,
    avgBuyPriceTon,
    avgBuyPrice,
    avgPriceUnit,
    currentPriceUsd,
    currentPriceTon,
    currentPrice,
    currentPriceUnit,
    holdingsValueTon: holdingsValueTon !== null ? holdingsValueTon : null,
    holdingsValueUsd: holdingsValueUsd !== null ? holdingsValueUsd : null,
    holdingsValue: formatTonUsdPair(
      holdingsValueTon !== null && spotHoldingsRaw > 0n ? holdingsValueTon : spotHoldingsRaw === 0n ? 0 : null,
      holdingsValueUsd !== null && spotHoldingsRaw > 0n ? holdingsValueUsd : spotHoldingsRaw === 0n ? 0 : null
    ),
    unrealizedProfitTon,
    unrealizedProfitUsd,
    realizedProfitTon: state.realizedProfitTon,
    realizedProfitUsd: state.realizedProfitUsd,
    currentProfitTon,
    currentProfitUsd,
    currentProfitPercentTon,
    currentProfitPercentUsd,
    currentProfit: formatTonUsdPair(currentProfitTon, currentProfitUsd),
    currentProfitPercentText: profitPercentParts.length > 0 ? profitPercentParts.join(" · ") : null,
    hasIncompleteTonBasis: state.missingCostTonEvents > 0 || state.missingProceedsTonEvents > 0,
    hasIncompleteUsdBasis: state.missingCostUsdEvents > 0 || state.missingProceedsUsdEvents > 0,
    trades: sortedTrades,
  };
}

/**
 * Builds portfolio PnL per jetton: TON and USD tracked separately (no TON→USD on costs).
 */
export function buildJettonPortfolioPnl(
  swaps: SwapActionSnapshot[],
  byJettonRows: JettonSwapBreakdownFormatted[],
  _tonUsdLookup: (timestampSec: number) => number | null,
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): JettonPortfolioPnlLine[] {
  void _tonUsdLookup;
  const map = new Map<string, JettonAccumulator>();

  for (const row of byJettonRows) {
    if (!isUsdtLikeJetton(row.jetton) && !isPtonLikeJetton(row.jetton)) {
      ensureAccumulator(map, row.jetton);
    }
  }

  const chronological = [...swaps].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const swap of chronological) {
    processSwap(swap, map, getJettonUsdAt);
  }

  ensureTonJettonTradesOnJettonLines(map, swaps, getJettonUsdAt);

  const order = new Map(byJettonRows.map((row, index) => [row.jetton.address.toLowerCase(), index]));

  return [...map.values()]
    .map(state => mapAccumulatorToLine(state))
    .filter(
      line =>
        !isUsdtLikeJetton(line.jetton) &&
        !isPtonLikeJetton(line.jetton) &&
        (line.holdingsRaw !== 0n || line.totalInvestedTon > 0 || line.totalInvestedUsd > 0 || line.trades.length > 0)
    )
    .sort((a, b) => {
      const orderA = order.get(a.jetton.address.toLowerCase()) ?? 9999;
      const orderB = order.get(b.jetton.address.toLowerCase()) ?? 9999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.jetton.symbol.localeCompare(b.jetton.symbol);
    });
}

export function sumPortfolioPnl(lines: JettonPortfolioPnlLine[]): PortfolioPnlTotals {
  let totalInvestedTon = 0;
  let totalInvestedUsd = 0;
  let totalHoldingsValueTon = 0;
  let totalHoldingsValueUsd = 0;
  let totalCurrentProfitTon = 0;
  let totalCurrentProfitUsd = 0;
  let hasIncompleteTon = false;
  let hasIncompleteUsd = false;

  for (const line of lines) {
    totalInvestedTon += line.totalInvestedTon;
    totalInvestedUsd += line.totalInvestedUsd;
    if (line.holdingsValueTon !== null) {
      totalHoldingsValueTon += line.holdingsValueTon;
    }
    if (line.holdingsValueUsd !== null) {
      totalHoldingsValueUsd += line.holdingsValueUsd;
    }
    if (line.currentProfitTon !== null) {
      totalCurrentProfitTon += line.currentProfitTon;
    }
    if (line.currentProfitUsd !== null) {
      totalCurrentProfitUsd += line.currentProfitUsd;
    }
    if (line.hasIncompleteTonBasis) {
      hasIncompleteTon = true;
    }
    if (line.hasIncompleteUsdBasis) {
      hasIncompleteUsd = true;
    }
  }

  return {
    totalInvestedTon,
    totalInvestedUsd,
    totalHoldingsValueTon,
    totalHoldingsValueUsd,
    totalCurrentProfitTon,
    totalCurrentProfitUsd,
    hasIncompleteTon,
    hasIncompleteUsd,
  };
}

/** @deprecated Use sumPortfolioPnl */
export const sumPortfolioPnlUsd = sumPortfolioPnl;

export const USDT_PORTFOLIO_ASSET_KEY = "usdt-stablecoin";

const TON_NATIVE_JETTON: SwapJettonRef = {
  address: TON_PORTFOLIO_ASSET_KEY,
  symbol: "TON",
  name: "Toncoin (incl. pTON)",
  decimals: 9,
  image: null,
  price: { usd: null, ton: 1, diff24hUsd: null },
};

function resolveTonBuyLeg(swap: SwapActionSnapshot): { amountRaw: bigint } | null {
  const { tonOutNanoton } = getEffectiveTonLegs(swap);
  return tonOutNanoton > 0n ? { amountRaw: tonOutNanoton } : null;
}

function resolveTonSellLeg(swap: SwapActionSnapshot): { amountRaw: bigint } | null {
  const { tonInNanoton } = getEffectiveTonLegs(swap);
  return tonInNanoton > 0n ? { amountRaw: tonInNanoton } : null;
}

function resolveUsdtBuyLeg(swap: SwapActionSnapshot): ResolvedJettonLeg | null {
  if (!swap.jettonOut || !isUsdtLikeJetton(swap.jettonOut)) {
    return null;
  }

  const amountOut = parseNanoton(swap.amountOut);
  return amountOut > 0n ? { jetton: swap.jettonOut, amountRaw: amountOut } : null;
}

function resolveUsdtSellLeg(swap: SwapActionSnapshot): ResolvedJettonLeg | null {
  if (!swap.jettonIn || !isUsdtLikeJetton(swap.jettonIn)) {
    return null;
  }

  const amountIn = parseNanoton(swap.amountIn);
  return amountIn > 0n ? { jetton: swap.jettonIn, amountRaw: amountIn } : null;
}

function legsTonOnly(legs: LegSumResult): LegSumResult {
  return {
    totalTon: legs.totalTon,
    totalUsd: 0,
    legs: legs.legs.filter(leg => leg.ton !== null),
    incompleteTon: legs.incompleteTon,
    incompleteUsd: legs.incompleteUsd && legs.totalTon === 0,
  };
}

function legsUsdOnly(legs: LegSumResult): LegSumResult {
  return {
    totalTon: 0,
    totalUsd: legs.totalUsd,
    legs: legs.legs.filter(leg => leg.usd !== null),
    incompleteTon: legs.incompleteTon && legs.totalUsd === 0,
    incompleteUsd: legs.incompleteUsd,
  };
}

const TON_DECIMALS_FOR_PORTFOLIO = 9;

function mapTonNativeAccumulatorToLine(state: JettonAccumulator): JettonPortfolioPnlLine {
  const holdingsRaw = state.totalBoughtRaw - state.totalSoldRaw;
  const holdingsHuman = rawToHuman(holdingsRaw > 0n ? holdingsRaw : 0n, TON_DECIMALS_FOR_PORTFOLIO);

  const holdingsValueTon = holdingsRaw > 0n ? holdingsHuman : holdingsRaw === 0n ? 0 : null;

  const unrealizedProfitTon =
    holdingsRaw > 0n && holdingsValueTon !== null
      ? holdingsValueTon - state.costBasisTon
      : holdingsRaw > 0n && state.costBasisTon > 0
        ? null
        : 0;

  const currentProfitTon =
    unrealizedProfitTon !== null || state.realizedProfitTon !== 0
      ? state.realizedProfitTon + (unrealizedProfitTon ?? 0)
      : null;

  const currentProfitPercentTon =
    currentProfitTon !== null && state.totalInvestedTon > 0 ? currentProfitTon / state.totalInvestedTon : null;

  let avgBuyPriceTon: number | null = null;
  if (holdingsRaw > 0n && state.costBasisTon > 0) {
    avgBuyPriceTon = state.costBasisTon / holdingsHuman;
  } else if (state.totalBoughtRaw > 0n && state.totalInvestedTon > 0) {
    avgBuyPriceTon = state.totalInvestedTon / rawToHuman(state.totalBoughtRaw, TON_DECIMALS_FOR_PORTFOLIO);
  }

  const sortedTrades = [...state.trades].sort(
    (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
  );

  return {
    jetton: state.jetton,
    isTonNative: true,
    holdingsRaw,
    holdings: formatTonFromNanoton(holdingsRaw > 0n ? holdingsRaw : 0n),
    totalInvestedTon: state.totalInvestedTon,
    totalInvestedUsd: 0,
    totalInvested: state.totalInvestedTon > 0 ? formatTonAmount(state.totalInvestedTon) : null,
    totalProceedsTon: state.totalProceedsTon,
    totalProceedsUsd: 0,
    avgBuyPriceUsd: null,
    avgBuyPriceTon,
    avgBuyPrice: avgBuyPriceTon !== null ? formatTonPrice(avgBuyPriceTon) : null,
    avgPriceUnit: avgBuyPriceTon !== null ? "ton" : "none",
    currentPriceUsd: null,
    currentPriceTon: 1,
    currentPrice: formatTonPrice(1),
    currentPriceUnit: "ton",
    holdingsValueTon,
    holdingsValueUsd: null,
    holdingsValue: holdingsValueTon !== null ? formatTonAmount(holdingsValueTon) : null,
    unrealizedProfitTon,
    unrealizedProfitUsd: null,
    realizedProfitTon: state.realizedProfitTon,
    realizedProfitUsd: 0,
    currentProfitTon,
    currentProfitUsd: null,
    currentProfitPercentTon,
    currentProfitPercentUsd: null,
    currentProfit: currentProfitTon !== null ? formatTonAmount(currentProfitTon) : null,
    currentProfitPercentText: formatPercentRatio(currentProfitPercentTon)
      ? `${formatPercentRatio(currentProfitPercentTon)} TON`
      : null,
    hasIncompleteTonBasis: state.missingCostTonEvents > 0 || state.missingProceedsTonEvents > 0,
    hasIncompleteUsdBasis: false,
    trades: sortedTrades,
  };
}

function mapUsdtNativeAccumulatorToLine(state: JettonAccumulator): JettonPortfolioPnlLine {
  const spotUsd = 1;
  const holdingsRaw = state.totalBoughtRaw - state.totalSoldRaw;
  const holdingsHuman = rawToHuman(holdingsRaw > 0n ? holdingsRaw : 0n, state.jetton.decimals);

  const holdingsValueUsd = holdingsRaw > 0n ? holdingsHuman * spotUsd : holdingsRaw === 0n ? 0 : null;

  const unrealizedProfitUsd =
    holdingsRaw > 0n && holdingsValueUsd !== null
      ? holdingsValueUsd - state.costBasisUsd
      : holdingsRaw > 0n && state.costBasisUsd > 0
        ? null
        : 0;

  const currentProfitUsd =
    unrealizedProfitUsd !== null || state.realizedProfitUsd !== 0
      ? state.realizedProfitUsd + (unrealizedProfitUsd ?? 0)
      : null;

  const currentProfitPercentUsd =
    currentProfitUsd !== null && state.totalInvestedUsd > 0 ? currentProfitUsd / state.totalInvestedUsd : null;

  let avgBuyPriceUsd: number | null = null;
  if (holdingsRaw > 0n && state.costBasisUsd > 0) {
    avgBuyPriceUsd = state.costBasisUsd / holdingsHuman;
  } else if (state.totalBoughtRaw > 0n && state.totalInvestedUsd > 0) {
    avgBuyPriceUsd = state.totalInvestedUsd / rawToHuman(state.totalBoughtRaw, state.jetton.decimals);
  }

  const sortedTrades = [...state.trades].sort(
    (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
  );

  return {
    jetton: state.jetton,
    holdingsRaw,
    holdings: formatJettonFromRaw(holdingsRaw, state.jetton.decimals, state.jetton.symbol),
    totalInvestedTon: 0,
    totalInvestedUsd: state.totalInvestedUsd,
    totalInvested: state.totalInvestedUsd > 0 ? formatUsd(state.totalInvestedUsd) : null,
    totalProceedsTon: 0,
    totalProceedsUsd: state.totalProceedsUsd,
    avgBuyPriceUsd,
    avgBuyPriceTon: null,
    avgBuyPrice: avgBuyPriceUsd !== null ? formatUsdUnitPrice(avgBuyPriceUsd) : null,
    avgPriceUnit: avgBuyPriceUsd !== null ? "usd" : "none",
    currentPriceUsd: spotUsd,
    currentPriceTon: null,
    currentPrice: formatUsd(spotUsd),
    currentPriceUnit: "usd",
    holdingsValueTon: null,
    holdingsValueUsd,
    holdingsValue: holdingsValueUsd !== null ? formatUsd(holdingsValueUsd) : null,
    unrealizedProfitTon: null,
    unrealizedProfitUsd,
    realizedProfitTon: 0,
    realizedProfitUsd: state.realizedProfitUsd,
    currentProfitTon: null,
    currentProfitUsd,
    currentProfitPercentTon: null,
    currentProfitPercentUsd,
    currentProfit: currentProfitUsd !== null ? formatUsd(currentProfitUsd) : null,
    currentProfitPercentText: formatPercentRatio(currentProfitPercentUsd)
      ? `${formatPercentRatio(currentProfitPercentUsd)} USD`
      : null,
    hasIncompleteTonBasis: false,
    hasIncompleteUsdBasis: state.missingCostUsdEvents > 0 || state.missingProceedsUsdEvents > 0,
    trades: sortedTrades,
  };
}

function resolveUsdtPortfolioJetton(swaps: SwapActionSnapshot[]): SwapJettonRef {
  for (const swap of swaps) {
    if (swap.jettonIn && isUsdtLikeJetton(swap.jettonIn)) {
      return {
        ...swap.jettonIn,
        price: { usd: 1, ton: swap.jettonIn.price?.ton ?? null, diff24hUsd: null },
      };
    }
    if (swap.jettonOut && isUsdtLikeJetton(swap.jettonOut)) {
      return {
        ...swap.jettonOut,
        price: { usd: 1, ton: swap.jettonOut.price?.ton ?? null, diff24hUsd: null },
      };
    }
  }

  return {
    address: USDT_PORTFOLIO_ASSET_KEY,
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    image: null,
    price: { usd: 1, ton: null, diff24hUsd: null },
  };
}

function processTonNativeSwaps(
  swaps: SwapActionSnapshot[],
  state: JettonAccumulator,
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): void {
  const chronological = [...swaps].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const swap of chronological) {
    const buyLeg = resolveTonBuyLeg(swap);
    if (buyLeg) {
      const paid = legsTonOnly(sumPaidLegsForSwap(swap, TON_PORTFOLIO_ASSET_KEY, getJettonUsdAt));
      applyBuy(state, swap, buyLeg.amountRaw, paid);
    }

    const sellLeg = resolveTonSellLeg(swap);
    if (sellLeg) {
      const proceeds = legsTonOnly(sumProceedsLegsForSwap(swap, TON_PORTFOLIO_ASSET_KEY, getJettonUsdAt));
      applySell(state, swap, sellLeg.amountRaw, proceeds);
    }
  }
}

function processUsdtNativeSwaps(
  swaps: SwapActionSnapshot[],
  state: JettonAccumulator,
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): void {
  const chronological = [...swaps].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const swap of chronological) {
    const buyLeg = resolveUsdtBuyLeg(swap);
    if (buyLeg) {
      const paid = legsUsdOnly(sumPaidLegsForSwap(swap, buyLeg.jetton.address, getJettonUsdAt));
      applyBuy(state, swap, buyLeg.amountRaw, paid);
    }

    const sellLeg = resolveUsdtSellLeg(swap);
    if (sellLeg) {
      const proceeds = legsUsdOnly(sumProceedsLegsForSwap(swap, sellLeg.jetton.address, getJettonUsdAt));
      applySell(state, swap, sellLeg.amountRaw, proceeds);
    }
  }
}

/**
 * Portfolio PnL for native TON (incl. pTON legs) — costs and proceeds only in TON.
 */
export function buildTonNativePortfolioPnl(
  swaps: SwapActionSnapshot[],
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): JettonPortfolioPnlLine | null {
  const hasTonFlow = swaps.some(swap => {
    const { tonInNanoton, tonOutNanoton } = getEffectiveTonLegs(swap);
    return tonInNanoton > 0n || tonOutNanoton > 0n;
  });

  if (!hasTonFlow) {
    return null;
  }

  const map = new Map<string, JettonAccumulator>();
  const state = ensureAccumulator(map, TON_NATIVE_JETTON);
  processTonNativeSwaps(swaps, state, getJettonUsdAt);

  return mapTonNativeAccumulatorToLine(state);
}

/**
 * Portfolio PnL for USDT / jUSDT — costs and proceeds only in USD.
 */
export function buildUsdtNativePortfolioPnl(
  swaps: SwapActionSnapshot[],
  getJettonUsdAt: (jetton: SwapJettonRef, timestampSec: number) => number | null
): JettonPortfolioPnlLine | null {
  const hasUsdtFlow = swaps.some(
    swap =>
      (swap.jettonIn && isUsdtLikeJetton(swap.jettonIn) && parseNanoton(swap.amountIn) > 0n) ||
      (swap.jettonOut && isUsdtLikeJetton(swap.jettonOut) && parseNanoton(swap.amountOut) > 0n)
  );

  if (!hasUsdtFlow) {
    return null;
  }

  const map = new Map<string, JettonAccumulator>();
  const state = ensureAccumulator(map, resolveUsdtPortfolioJetton(swaps));
  processUsdtNativeSwaps(swaps, state, getJettonUsdAt);

  return mapUsdtNativeAccumulatorToLine(state);
}
