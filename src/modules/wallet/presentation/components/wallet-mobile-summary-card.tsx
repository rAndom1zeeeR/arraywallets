"use client";

import Link from "next/link";
import { QrCode } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { WalletSummaryQueryResult } from "@/modules/wallet/api/wallet-api.client";
import { SyncButton } from "@/modules/wallet/presentation/components/SyncButton";
import { walletBalancesQueryOptions } from "@/modules/wallet/presentation/hooks/wallet-query-options";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { ChainSyncStatus } from "@/shared/constants/chain-prisma.enums";
import { CopyToClipboardButton } from "@/shared/presentation/components/explorer/copy-to-clipboard-button";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { truncateMiddle } from "@/shared/lib/truncate-middle.utils";
import { cn } from "@/shared/lib/utils";

interface WalletMobileSummaryCardProps {
  address: string;
  summary: WalletSummaryQueryResult;
  isSyncing: boolean;
  autoStartSync?: boolean;
}

export const WalletMobileSummaryCard = ({
  address,
  summary,
  isSyncing,
  autoStartSync = false,
}: WalletMobileSummaryCardProps) => {
  const { stats, syncState, swapStats } = summary;
  const balancesQuery = useQuery(walletBalancesQueryOptions(address));
  const jettonCount = swapStats.byJetton.length;
  const isActive = syncState?.status !== ChainSyncStatus.ERROR;
  const workchainHint = truncateMiddle(address, 5, 5);

  const tonBalance = balancesQuery.data?.tonBalance;

  const tokensSummary =
    balancesQuery.data && balancesQuery.data.jettons.length > 0
      ? `${balancesQuery.data.jettons.length} jetton${balancesQuery.data.jettons.length === 1 ? "" : "s"}`
      : jettonCount > 0
        ? `${jettonCount} tracked`
        : "0";

  return (
    <div className={cn(explorerStyles.card, "mx-4 mt-4 lg:hidden")}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs tracking-wide text-muted-foreground uppercase">Address</span>
            <p className="mt-0.5 text-xs leading-relaxed break-all text-foreground">{address}</p>
          </div>
          <div className="mt-4 flex shrink-0 items-center gap-1">
            <CopyToClipboardButton
              value={address}
              className="flex size-7 items-center justify-center rounded-lg bg-explorer-surface-2 text-muted-foreground"
              iconClassName="size-3"
            />
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-lg bg-explorer-surface-2 text-muted-foreground"
              aria-label="Show QR code"
              disabled
              title="QR code coming soon"
            >
              <QrCode className="size-3" aria-hidden />
            </button>
          </div>
        </div>

        <div className={explorerStyles.divider} />

        <div className={explorerStyles.metricRow}>
          <span className={explorerStyles.metricLabel}>Balance</span>
          <div className="text-right">
            {balancesQuery.isPending ? (
              <span className="text-sm text-muted-foreground">Loading…</span>
            ) : balancesQuery.isError ? (
              <span className="text-sm text-muted-foreground">—</span>
            ) : (
              <span className={explorerStyles.metricValue}>{tonBalance ?? "—"}</span>
            )}
          </div>
        </div>

        <div className={explorerStyles.metricRow}>
          <span className={explorerStyles.metricLabel}>Tokens</span>
          <div className="flex items-center gap-2">
            <span className={explorerStyles.metricValue}>{tokensSummary}</span>
            {jettonCount > 0 && (
              <Link
                href={getWalletPagePath(address, { tab: "tokens" })}
                className="text-xs font-medium text-primary"
              >
                All
              </Link>
            )}
          </div>
        </div>

        <div className={explorerStyles.metricRow}>
          <span className={explorerStyles.metricLabel}>Swaps</span>
          <span className={explorerStyles.metricValue}>{swapStats.aggregate.swapCount}</span>
        </div>

        <div className={explorerStyles.divider} />

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn("size-2 rounded-full", isActive ? "bg-profit" : "bg-loss")}
              aria-hidden
            />
            <span className="text-xs text-muted-foreground">{isActive ? "Active" : "Error"}</span>
            <span className="text-xs text-muted-foreground">{workchainHint}</span>
          </div>
          <a
            href={`https://tonviewer.com/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary"
          >
            tonviewer.com
          </a>
        </div>

        <div className={explorerStyles.divider} />

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="text-muted-foreground">{stats.events} events</span>
          <span className="text-muted-foreground">{stats.actions} actions</span>
          {stats.incompleteEvents > 0 && (
            <span className="font-medium text-chart-5">Incomplete: {stats.incompleteEvents}</span>
          )}
          {syncState?.status === ChainSyncStatus.COMPLETED && (
            <span className="font-medium text-profit">COMPLETED</span>
          )}
          {syncState?.status === ChainSyncStatus.SYNCING && (
            <span className="font-medium text-primary">SYNCING</span>
          )}
        </div>
      </div>

      <SyncButton
        address={address}
        isSyncing={isSyncing}
        incompleteEvents={stats.incompleteEvents}
        historyComplete={syncState?.historyComplete ?? false}
        autoStart={autoStartSync}
        embedded
      />
    </div>
  );
};
