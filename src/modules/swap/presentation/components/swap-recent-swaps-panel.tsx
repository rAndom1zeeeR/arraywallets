"use client";

import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  isTonNativeJetton,
  resolveSwapDisplayJetton,
  SWAP_LEG_KIND_LABELS,
  SWAP_LIST_INITIAL_VISIBLE,
} from "@/modules/swap/domain/swap-stats-display.utils";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";
import type { SwapActionSnapshot, SwapJettonRef } from "@/modules/swap/domain/swap-stats.utils";
import { formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface SwapRecentSwapsPanelProps {
  swaps: WalletSwapStatsResult["swaps"];
  className?: string;
}

interface SwapJettonAvatarProps {
  jetton: SwapJettonRef | null;
}

function SwapJettonAvatar({ jetton }: SwapJettonAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!jetton || isTonNativeJetton(jetton)) {
    return (
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
        aria-hidden
      >
        T
      </div>
    );
  }

  const showImage = Boolean(jetton.image) && !hasImageError;

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-explorer-surface-2",
        !showImage && "text-[10px] font-semibold text-muted-foreground"
      )}
      aria-hidden={showImage}
    >
      {showImage ? (
        <img
          src={jetton.image ?? undefined}
          alt=""
          width={36}
          height={36}
          className="size-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        (jetton.symbol || "?").slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

interface SwapListItemProps {
  swap: SwapActionSnapshot;
}

function SwapListItem({ swap }: SwapListItemProps) {
  const jetton = resolveSwapDisplayJetton(swap);

  return (
    <li className="border-b border-border px-4 py-3 last:border-b-0 sm:px-5">
      <div className="flex items-start gap-3">
        <SwapJettonAvatar jetton={jetton} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <time className="text-xs text-muted-foreground">{swap.timestamp.toLocaleString()}</time>
            <div className="flex flex-wrap justify-end gap-1.5">
              {swap.isInferred && (
                <span className="rounded bg-explorer-tag-jetton px-1.5 py-0.5 text-[10px] font-medium uppercase text-explorer-tag-jetton-text">
                  inferred
                </span>
              )}
              {swap.dex && (
                <span className="rounded bg-explorer-surface-2 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {swap.dex}
                </span>
              )}
            </div>
          </div>

          <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
            {swap.displayAmount ?? "—"}
          </p>

          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {SWAP_LEG_KIND_LABELS[swap.legKind] ?? swap.legKind}
            {swap.inferenceReason && <> · {swap.inferenceReason}</>}
            {(swap.tonIn || swap.tonOut) && (
              <>
                {" "}
                · TON in: {formatTonFromNanoton(parseNanoton(swap.tonIn))} · out:{" "}
                {formatTonFromNanoton(parseNanoton(swap.tonOut))}
              </>
            )}
          </p>
        </div>
      </div>
    </li>
  );
}

export const SwapRecentSwapsPanel = ({ swaps, className }: SwapRecentSwapsPanelProps) => {
  const [showAll, setShowAll] = useState(false);

  if (swaps.length === 0) {
    return null;
  }

  const hiddenCount = Math.max(0, swaps.length - SWAP_LIST_INITIAL_VISIBLE);
  const visibleSwaps = showAll ? swaps : swaps.slice(0, SWAP_LIST_INITIAL_VISIBLE);

  return (
    <section
      className={cn(explorerStyles.card, className)}
      aria-label={`All swaps (${swaps.length})`}
    >
      <div className={explorerStyles.cardHeader}>
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-sm font-semibold text-foreground">All swaps ({swaps.length})</span>
        </div>
      </div>

      <ul>
        {visibleSwaps.map(swap => (
          <SwapListItem key={swap.id} swap={swap} />
        ))}
      </ul>

      {hiddenCount > 0 && !showAll && (
        <div className="border-t border-border px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full rounded-lg border border-border bg-explorer-surface-2 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-explorer-surface-2/80"
          >
            Show more ({hiddenCount})
          </button>
        </div>
      )}
    </section>
  );
};
