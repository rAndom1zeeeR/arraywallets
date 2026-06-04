import { toRawTonAddress } from "@/shared/lib/ton/ton-address";
import { parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import { applyDexFeeToTonLegs, extractDexFeeNanoton } from "@/modules/swap/domain/swap-fee.utils";
import type { SwapActionSnapshot, SwapJettonRef } from "@/modules/swap/domain/swap-stats.utils";

const TON_DECIMALS = 9;

/** Known wrapped/proxy TON jetton masters (Ston.fi pTON, etc.). */
const PTON_MASTER_RAW_ADDRESSES = new Set<string>([]);

/**
 * Detects pTON / Proxy TON / wrapped TON jettons that should be treated as native TON.
 */
export function isPtonLikeJetton(jetton: SwapJettonRef): boolean {
  const symbol = jetton.symbol.replace(/\s/g, "").toUpperCase();
  const name = jetton.name.toUpperCase();

  if (symbol === "PTON" || symbol === "PROXYTON" || symbol === "WTON" || symbol === "WAPPEDTON") {
    return true;
  }

  if (name.includes("PROXY TON") || name.includes("WRAPPED TON") || name.includes("PROXYTON")) {
    return true;
  }

  try {
    return PTON_MASTER_RAW_ADDRESSES.has(toRawTonAddress(jetton.address));
  } catch {
    return false;
  }
}

/**
 * Converts jetton raw units to nanoton (pTON is 1:1 with TON at 9 decimals).
 */
export function jettonRawToNanoton(raw: bigint, decimals: number): bigint {
  if (raw <= 0n) {
    return 0n;
  }

  if (decimals === TON_DECIMALS) {
    return raw;
  }

  if (decimals > TON_DECIMALS) {
    return raw / 10n ** BigInt(decimals - TON_DECIMALS);
  }

  return raw * 10n ** BigInt(TON_DECIMALS - decimals);
}

/**
 * Native TON and pTON are the same asset — when both appear on one leg, take the larger amount, do not sum.
 */
function mergeNativeAndPtonNanoton(nativeNanoton: bigint, ptonNanoton: bigint): bigint {
  if (nativeNanoton <= 0n) {
    return ptonNanoton;
  }

  if (ptonNanoton <= 0n) {
    return nativeNanoton;
  }

  return nativeNanoton >= ptonNanoton ? nativeNanoton : ptonNanoton;
}

/**
 * Resolves native TON in/out including pTON jetton legs on a swap snapshot.
 */
export function getEffectiveTonLegs(swap: SwapActionSnapshot): { tonInNanoton: bigint; tonOutNanoton: bigint } {
  const nativeTonIn = parseNanoton(swap.tonIn);
  const nativeTonOut = parseNanoton(swap.tonOut);

  const amountIn = parseNanoton(swap.amountIn);
  const amountOut = parseNanoton(swap.amountOut);

  const ptonInNanoton =
    swap.jettonIn && isPtonLikeJetton(swap.jettonIn) && amountIn > 0n
      ? jettonRawToNanoton(amountIn, swap.jettonIn.decimals)
      : 0n;

  const ptonOutNanoton =
    swap.jettonOut && isPtonLikeJetton(swap.jettonOut) && amountOut > 0n
      ? jettonRawToNanoton(amountOut, swap.jettonOut.decimals)
      : 0n;

  let tonInNanoton = mergeNativeAndPtonNanoton(nativeTonIn, ptonInNanoton);
  let tonOutNanoton = mergeNativeAndPtonNanoton(nativeTonOut, ptonOutNanoton);

  const dexFeeNanoton = extractDexFeeNanoton(
    swap.dexFeeNanoton !== null ? { feeTonNanoton: swap.dexFeeNanoton } : null
  );

  return applyDexFeeToTonLegs({
    tonInNanoton,
    tonOutNanoton,
    dexFeeNanoton,
    legKind: swap.legKind,
  });
}
