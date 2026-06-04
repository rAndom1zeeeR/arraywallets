import type { SwapActionSnapshot } from "@/features/sync-events/lib/swap-stats.utils";

export type JettonSwapParticipationRole = "sold" | "bought" | "both";

export interface JettonRelatedSwapItem {
  id: string;
  tonEventId: string;
  timestampIso: string;
  displayAmount: string | null;
  dex: string | null;
  legKind: string;
  legKindLabel: string;
  tonIn: string | null;
  tonOut: string | null;
  jettonInSymbol: string | null;
  jettonOutSymbol: string | null;
  role: JettonSwapParticipationRole;
}

const LEG_KIND_LABELS: Record<string, string> = {
  ton_jetton: "TON → Jetton",
  jetton_ton: "Jetton → TON",
  jetton_jetton: "Jetton ↔ Jetton",
  ton_ton: "TON ↔ TON",
  unknown: "Other",
};

const ROLE_LABELS: Record<JettonSwapParticipationRole, string> = {
  sold: "Sold",
  bought: "Bought",
  both: "Swap",
};

export function getJettonSwapRoleLabel(role: JettonSwapParticipationRole): string {
  return ROLE_LABELS[role];
}

function resolveParticipationRole(
  swap: SwapActionSnapshot,
  jettonAddressKey: string
): JettonSwapParticipationRole | null {
  const isIn = swap.jettonIn?.address.toLowerCase() === jettonAddressKey;
  const isOut = swap.jettonOut?.address.toLowerCase() === jettonAddressKey;

  if (isIn && isOut) {
    return "both";
  }

  if (isIn) {
    return "sold";
  }

  if (isOut) {
    return "bought";
  }

  return null;
}

function mapSwapToRelatedItem(swap: SwapActionSnapshot, role: JettonSwapParticipationRole): JettonRelatedSwapItem {
  return {
    id: swap.id,
    tonEventId: swap.tonEventId,
    timestampIso: swap.timestamp.toISOString(),
    displayAmount: swap.displayAmount,
    dex: swap.dex,
    legKind: swap.legKind,
    legKindLabel: LEG_KIND_LABELS[swap.legKind] ?? swap.legKind,
    tonIn: swap.tonIn,
    tonOut: swap.tonOut,
    jettonInSymbol: swap.jettonInSymbol,
    jettonOutSymbol: swap.jettonOutSymbol,
    role,
  };
}

/**
 * Returns all swaps where the jetton participated as in or out leg.
 */
export function getRelatedSwapsForJetton(swaps: SwapActionSnapshot[], jettonAddress: string): JettonRelatedSwapItem[] {
  const key = jettonAddress.toLowerCase();

  return swaps
    .map(swap => {
      const role = resolveParticipationRole(swap, key);
      if (!role) {
        return null;
      }

      return mapSwapToRelatedItem(swap, role);
    })
    .filter((item): item is JettonRelatedSwapItem => item !== null);
}

/**
 * Groups swap snapshots by jetton master address (lowercase).
 */
export function groupSwapsByJettonAddress(swaps: SwapActionSnapshot[]): Map<string, JettonRelatedSwapItem[]> {
  const addresses = new Set<string>();

  for (const swap of swaps) {
    if (swap.jettonIn) {
      addresses.add(swap.jettonIn.address.toLowerCase());
    }
    if (swap.jettonOut) {
      addresses.add(swap.jettonOut.address.toLowerCase());
    }
  }

  const grouped = new Map<string, JettonRelatedSwapItem[]>();

  for (const addressKey of addresses) {
    const jettonAddress =
      swaps.find(
        s => s.jettonIn?.address.toLowerCase() === addressKey || s.jettonOut?.address.toLowerCase() === addressKey
      )?.jettonIn?.address ?? swaps.find(s => s.jettonOut?.address.toLowerCase() === addressKey)?.jettonOut?.address;

    if (!jettonAddress) {
      continue;
    }

    grouped.set(addressKey, getRelatedSwapsForJetton(swaps, jettonAddress));
  }

  return grouped;
}
