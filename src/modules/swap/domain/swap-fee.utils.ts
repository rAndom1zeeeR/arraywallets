import { parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import type { SwapLegKind } from "@/modules/swap/domain/swap-stats.utils";

/**
 * Reads DTrade/DeDust fee stored on inferred swap metadata.
 */
export function extractDexFeeNanoton(metadata: unknown): bigint {
  if (!metadata || typeof metadata !== "object") {
    return 0n;
  }

  const fee = (metadata as { feeTonNanoton?: unknown }).feeTonNanoton;
  if (typeof fee === "string" && fee.length > 0) {
    return parseNanoton(fee);
  }

  return 0n;
}

/**
 * Applies DEX fee to wallet-level TON legs:
 * - buys: fee is extra spend on top of contract payment (already net of refund)
 * - sells: fee reduces net TON received
 */
export function applyDexFeeToTonLegs(params: {
  tonInNanoton: bigint;
  tonOutNanoton: bigint;
  dexFeeNanoton: bigint;
  legKind: SwapLegKind;
}): { tonInNanoton: bigint; tonOutNanoton: bigint } {
  const { dexFeeNanoton, legKind } = params;

  if (dexFeeNanoton <= 0n) {
    return { tonInNanoton: params.tonInNanoton, tonOutNanoton: params.tonOutNanoton };
  }

  if (legKind === "ton_jetton" || (params.tonInNanoton > 0n && params.tonOutNanoton === 0n)) {
    return {
      tonInNanoton: params.tonInNanoton + dexFeeNanoton,
      tonOutNanoton: params.tonOutNanoton,
    };
  }

  if (legKind === "jetton_ton" || (params.tonOutNanoton > 0n && params.tonInNanoton === 0n)) {
    const netOut =
      params.tonOutNanoton > dexFeeNanoton ? params.tonOutNanoton - dexFeeNanoton : params.tonOutNanoton;
    return {
      tonInNanoton: params.tonInNanoton,
      tonOutNanoton: netOut,
    };
  }

  return { tonInNanoton: params.tonInNanoton, tonOutNanoton: params.tonOutNanoton };
}
