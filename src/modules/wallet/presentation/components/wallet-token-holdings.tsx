import type { JettonSwapBreakdownFormatted } from "@/modules/swap/domain/swap-stats.utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface WalletTokenHoldingsProps {
  holdings: JettonSwapBreakdownFormatted[];
  totalCount: number;
  /** When true, show the full list (tokens tab). Otherwise sidebar preview (max 4). */
  showAll?: boolean;
}

const getInitials = (symbol: string): string => {
  const trimmed = symbol.trim();
  if (trimmed.length <= 2) {
    return trimmed.toUpperCase();
  }

  return trimmed.slice(0, 2).toUpperCase();
};

export const WalletTokenHoldings = ({
  holdings,
  totalCount,
  showAll = false,
}: WalletTokenHoldingsProps) => {
  const visible = showAll ? holdings : holdings.slice(0, 4);

  if (visible.length === 0) {
    return (
      <section className={explorerStyles.card} aria-label="Token holdings">
        <div className={explorerStyles.cardHeader}>
          <span className="text-sm font-semibold text-foreground">Token Holdings</span>
        </div>
        <p className="px-5 py-8 text-center text-sm text-muted-foreground">
          No tracked jettons for this wallet yet.
        </p>
      </section>
    );
  }

  return (
    <section
      id="wallet-token-holdings"
      className={explorerStyles.card}
      aria-label="Token holdings"
    >
      <div className={explorerStyles.cardHeader}>
        <span className="text-sm font-semibold text-foreground">Token Holdings</span>
        {!showAll && totalCount > visible.length && (
          <span className="text-xs text-muted-foreground">{totalCount} tracked</span>
        )}
        {showAll && (
          <span className="text-xs text-muted-foreground">{totalCount} tracked</span>
        )}
      </div>
      <div className="flex flex-col">
        {visible.map(row => {
          const netPositive = row.receivedRaw > row.spentRaw;

          return (
            <div
              key={row.jetton.address}
              className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-explorer-surface-2 text-xs font-semibold text-foreground"
                  )}
                >
                  {getInitials(row.jetton.symbol)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{row.jetton.symbol}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.jetton.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground tabular-nums">{row.received}</p>
                <p className="flex items-center justify-end gap-1 text-xs tabular-nums">
                  <span className="text-muted-foreground">spent {row.spent}</span>
                  <span className={netPositive ? "text-profit" : "text-loss"}>
                    {netPositive ? "+" : "−"}
                  </span>
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
