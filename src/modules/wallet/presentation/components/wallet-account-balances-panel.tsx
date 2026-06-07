"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CompactMoneyJettonAmount } from "@/modules/jetton/presentation/components/CompactMoneyAmount";
import { JettonAssetCell } from "@/modules/jetton/presentation/components/JettonAssetCell";
import type { WalletAccountBalances } from "@/modules/wallet/domain/wallet-balances.types";
import { walletBalancesQueryOptions } from "@/modules/wallet/presentation/hooks/wallet-query-options";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface WalletAccountBalancesPanelProps {
  address: string;
  trackedJettonCount: number;
}

export const WalletAccountBalancesPanel = ({
  address,
  trackedJettonCount,
}: WalletAccountBalancesPanelProps) => {
  const balancesQuery = useQuery(walletBalancesQueryOptions(address));

  if (balancesQuery.isPending) {
    return (
      <section className={explorerStyles.card} aria-label="Current balance" aria-busy="true">
        <div className={explorerStyles.cardHeader}>
          <span className="text-sm font-semibold text-foreground">Current balance</span>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div className="h-10 animate-pulse rounded-lg bg-explorer-surface-2" />
          <div className="h-8 animate-pulse rounded-lg bg-explorer-surface-2" />
          <div className="h-8 animate-pulse rounded-lg bg-explorer-surface-2" />
        </div>
      </section>
    );
  }

  if (balancesQuery.isError) {
    const message =
      balancesQuery.error instanceof Error
        ? balancesQuery.error.message
        : "Failed to load on-chain balances";

    return (
      <section className={explorerStyles.card} aria-label="Current balance">
        <div className={explorerStyles.cardHeader}>
          <span className="text-sm font-semibold text-foreground">Current balance</span>
        </div>
        <p className="px-5 py-4 text-sm text-loss">{message}</p>
      </section>
    );
  }

  const balances: WalletAccountBalances | undefined = balancesQuery.data;
  if (!balances) {
    return null;
  }

  const { tonBalanceNanoton, jettons } = balances;

  return (
    <section className={explorerStyles.card} aria-label="Current balance">
      <div className={explorerStyles.cardHeader}>
        <span className="text-sm font-semibold text-foreground">Current balance</span>
        {trackedJettonCount > 0 && (
          <Link
            href={getWalletPagePath(address, { tab: "tokens" })}
            className="text-xs font-medium text-primary hover:underline"
          >
            Swap stats
          </Link>
        )}
      </div>

      <div className={explorerStyles.cardBody}>
        <div className={explorerStyles.metricRow}>
          <span className={explorerStyles.metricLabel}>TON</span>
          <CompactMoneyJettonAmount
            raw={tonBalanceNanoton}
            decimals={9}
            className={cn(explorerStyles.metricValue, "tabular-nums")}
          />
        </div>

        {jettons.length > 0 ? (
          <>
            <div className={explorerStyles.divider} />
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                Jettons ({jettons.length})
              </p>
              <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                {jettons.map(row => (
                  <li
                    key={row.jetton.address}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-explorer-surface-2/40 px-3 py-2"
                  >
                    <JettonAssetCell jetton={row.jetton} />
                    <CompactMoneyJettonAmount
                      raw={row.balanceRaw}
                      decimals={row.jetton.decimals}
                      className="shrink-0 text-right text-sm font-semibold text-foreground tabular-nums"
                    />
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No jettons with balance on this wallet.</p>
        )}
      </div>
    </section>
  );
};
