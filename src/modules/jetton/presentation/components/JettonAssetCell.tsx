"use client";

import { useState } from "react";
import { TON_PORTFOLIO_ASSET_KEY } from "@/modules/jetton/domain/jetton-portfolio-pnl.utils";
import type { SwapJettonRef } from "@/modules/swap/domain/swap-stats.utils";
import { cn } from "@/shared/lib/utils";

interface JettonAssetCellProps {
  jetton: SwapJettonRef;
}

function JettonAvatar({ jetton }: JettonAssetCellProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(jetton.image) && !hasImageError;

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary sm:h-9 sm:w-9",
        !showImage && "text-[10px] font-semibold text-muted-foreground sm:text-xs"
      )}
      aria-hidden={showImage}
    >
      {showImage ? (
        <img
          src={jetton.image ?? undefined}
          alt=""
          width={36}
          height={36}
          className="h-full w-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        (jetton.symbol || "?").slice(0, 2).toUpperCase()
      )}
    </div>
  );
}

export function JettonAssetCell({ jetton }: JettonAssetCellProps) {
  const isTonNative = jetton.address === TON_PORTFOLIO_ASSET_KEY;

  return (
    <div className="flex min-w-[8.5rem] items-center gap-2.5 sm:min-w-[10rem] sm:gap-3">
      {isTonNative ? (
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground sm:h-9 sm:w-9 sm:text-xs"
          aria-hidden
        >
          T
        </div>
      ) : (
        <JettonAvatar jetton={jetton} />
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{jetton.symbol}</div>
        <div className="truncate text-xs text-muted-foreground">{jetton.name}</div>
      </div>
    </div>
  );
}
