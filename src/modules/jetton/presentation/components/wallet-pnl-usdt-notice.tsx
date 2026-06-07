"use client";

import { Info } from "lucide-react";

interface WalletPnlUsdtNoticeProps {
  symbol?: string;
}

export function WalletPnlUsdtNotice({ symbol = "USDT" }: WalletPnlUsdtNoticeProps) {
  return (
    <div
      className="flex items-start gap-2 rounded-xl border border-border bg-explorer-surface px-4 py-3 text-sm text-muted-foreground"
      role="note"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span>PnL {symbol}: No swaps with {symbol} in wallet data</span>
    </div>
  );
}
