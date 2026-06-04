import { toRawTonAddress } from "@/shared/lib/ton-address";
import type { SwapJettonRef } from "@/features/sync-events/lib/swap-stats.utils";

interface RawEventPayload {
  actions?: unknown[];
}

interface RawAddressObject {
  workchain?: number;
  workChain?: number;
  hash?: string;
  toString?: () => string;
}

interface RawJettonPreview {
  address?: string | RawAddressObject;
  name?: string;
  symbol?: string;
  decimals?: number;
}

interface RawJettonSwap {
  amount_in?: string | number | bigint;
  amount_out?: string | number | bigint;
  ton_in?: string | number | bigint;
  ton_out?: string | number | bigint;
  amountIn?: string | number | bigint;
  amountOut?: string | number | bigint;
  tonIn?: string | number | bigint;
  tonOut?: string | number | bigint;
  jetton_master_in?: RawJettonPreview;
  jetton_master_out?: RawJettonPreview;
  jettonMasterIn?: RawJettonPreview;
  jettonMasterOut?: RawJettonPreview;
}

export interface ParsedJettonSwapFromRaw {
  amountIn: string | null;
  amountOut: string | null;
  tonIn: string | null;
  tonOut: string | null;
  jettonIn: SwapJettonRef | null;
  jettonOut: SwapJettonRef | null;
}

function rawBigIntToString(value: string | number | bigint | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(Math.trunc(value)) : null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.split(".")[0] : null;
}

function resolveJettonPreviewAddress(preview: RawJettonPreview): string | null {
  const { address } = preview;
  if (!address) {
    return null;
  }

  if (typeof address === "string") {
    return address;
  }

  if (typeof address.toString === "function") {
    const asString = address.toString();
    if (asString && !asString.startsWith("[object ")) {
      return asString;
    }
  }

  const hash = typeof address.hash === "string" ? address.hash : null;
  if (!hash) {
    return null;
  }

  const workchain = address.workchain ?? address.workChain ?? 0;
  return `${workchain}:${hash}`;
}

function mapRawJetton(preview: RawJettonPreview | undefined): SwapJettonRef | null {
  if (!preview) {
    return null;
  }

  const addressValue = resolveJettonPreviewAddress(preview);
  if (!addressValue) {
    return null;
  }

  return {
    address: toRawTonAddress(addressValue),
    name: preview.name ?? preview.symbol ?? "Jetton",
    symbol: preview.symbol ?? "?",
    decimals: preview.decimals ?? 9,
  };
}

/**
 * Reads JettonSwap legs from stored TON API event JSON when DB columns are incomplete.
 */
export function parseJettonSwapFromRawEvent(rawData: unknown, orderIndex: number): ParsedJettonSwapFromRaw | null {
  if (!rawData || typeof rawData !== "object") {
    return null;
  }

  const actions = (rawData as RawEventPayload).actions;
  if (!Array.isArray(actions) || orderIndex < 0 || orderIndex >= actions.length) {
    return null;
  }

  const action = actions[orderIndex];
  if (!action || typeof action !== "object") {
    return null;
  }

  const swap = (action as { JettonSwap?: RawJettonSwap }).JettonSwap;
  if (!swap) {
    return null;
  }

  const amountIn = rawBigIntToString(swap.amountIn ?? swap.amount_in);
  const amountOut = rawBigIntToString(swap.amountOut ?? swap.amount_out);
  const tonIn = rawBigIntToString(swap.tonIn ?? swap.ton_in);
  const tonOut = rawBigIntToString(swap.tonOut ?? swap.ton_out);

  return {
    amountIn,
    amountOut,
    tonIn,
    tonOut,
    jettonIn: mapRawJetton(swap.jettonMasterIn ?? swap.jetton_master_in),
    jettonOut: mapRawJetton(swap.jettonMasterOut ?? swap.jetton_master_out),
  };
}
