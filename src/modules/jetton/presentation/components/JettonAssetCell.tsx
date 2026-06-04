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
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800",
        !showImage && "text-xs font-semibold text-gray-600 dark:text-gray-300"
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
    <div className="flex min-w-[10rem] items-center gap-3">
      {isTonNative ? (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-xs font-bold text-white"
          aria-hidden
        >
          T
        </div>
      ) : (
        <JettonAvatar jetton={jetton} />
      )}
      <div className="min-w-0">
        <div className="truncate font-semibold text-gray-900 dark:text-gray-100">{jetton.symbol}</div>
        <div className="truncate text-xs text-gray-500 dark:text-gray-400">{jetton.name}</div>
      </div>
    </div>
  );
}
