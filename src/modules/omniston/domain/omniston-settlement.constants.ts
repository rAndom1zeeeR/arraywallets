import type {
  OrderSettlementParams,
  SettlementParams,
  SwapSettlementParams,
} from "@ston-fi/omniston-sdk-react";

/** 1% max price slippage (10_000 pips = 0.1% per SDK docs). */
const DEFAULT_MAX_PRICE_SLIPPAGE_PIPS = 10_000;

const swapSettlementParams: SwapSettlementParams = {
  maxPriceSlippagePips: DEFAULT_MAX_PRICE_SLIPPAGE_PIPS,
  flexibleIntegratorFee: true,
};

const orderSettlementParams: OrderSettlementParams = {};

/** TON intrachain swap quotes only. */
export const OMNISTON_SWAP_ONLY_SETTLEMENT_PARAMS: SettlementParams[] = [
  {
    params: {
      $case: "swap",
      value: swapSettlementParams,
    },
  },
];

/** Swap + cross-chain order settlement (HTLC). */
export const OMNISTON_SWAP_AND_ORDER_SETTLEMENT_PARAMS: SettlementParams[] = [
  {
    params: {
      $case: "swap",
      value: swapSettlementParams,
    },
  },
  {
    params: {
      $case: "order",
      value: orderSettlementParams,
    },
  },
];
