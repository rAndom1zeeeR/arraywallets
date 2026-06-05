import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import type { SwapActionSnapshot } from "@/modules/swap/domain/swap-stats.utils";
import { isPtonLikeJetton } from "@/modules/swap/domain/wrapped-ton.utils";
import { TON_PORTFOLIO_ASSET_KEY } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import type { SwapJettonRef } from "@/modules/swap/domain/swap-stats.utils";

export const SWAP_LEG_KIND_LABELS: Record<string, string> = {
  ton_jetton: "TON → Jetton",
  jetton_ton: "Jetton → TON",
  jetton_jetton: "Jetton ↔ Jetton",
  ton_ton: "TON ↔ TON",
  unknown: "Other",
};

export function formatSwapLegCounts(
  swaps: WalletSwapStatsResult["swaps"]
): Array<{ kind: string; count: number }> {
  const counts = new Map<string, number>();

  for (const swap of swaps) {
    const label = SWAP_LEG_KIND_LABELS[swap.legKind] ?? swap.legKind;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);
}

export const SWAP_LIST_INITIAL_VISIBLE = 10;

/** Primary jetton icon for a swap row (non-pTON / non-TON leg when possible). */
export function resolveSwapDisplayJetton(swap: SwapActionSnapshot): SwapJettonRef | null {
  if (swap.legKind === "jetton_ton" && swap.jettonIn && !isPtonLikeJetton(swap.jettonIn)) {
    return swap.jettonIn;
  }

  if (swap.legKind === "ton_jetton" && swap.jettonOut && !isPtonLikeJetton(swap.jettonOut)) {
    return swap.jettonOut;
  }

  if (swap.jettonOut && !isPtonLikeJetton(swap.jettonOut)) {
    return swap.jettonOut;
  }

  if (swap.jettonIn && !isPtonLikeJetton(swap.jettonIn)) {
    return swap.jettonIn;
  }

  return swap.jettonOut ?? swap.jettonIn;
}

export function isTonNativeJetton(jetton: SwapJettonRef | null): boolean {
  return jetton?.address === TON_PORTFOLIO_ASSET_KEY;
}
