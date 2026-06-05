"use client";

import Link from "next/link";
import { QrCode } from "lucide-react";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import type { WalletSummaryQueryResult } from "@/modules/wallet/api/wallet-api.client";
import { SyncButton } from "@/modules/wallet/presentation/components/SyncButton";
import { formatMoneyTonFromNanoton } from "@/modules/jetton/domain/money-format.utils";
import { ChainSyncStatus } from "@/shared/constants/chain-prisma.enums";
import { CopyToClipboardButton } from "@/shared/presentation/components/explorer/copy-to-clipboard-button";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { truncateMiddle } from "@/shared/lib/truncate-middle.utils";
import { cn } from "@/shared/lib/utils";

interface WalletSidebarPanelProps {
  address: string;
  summary: WalletSummaryQueryResult;
  isSyncing: boolean;
  autoStartSync?: boolean;
}

export const WalletSidebarPanel = ({
  address,
  summary,
  isSyncing,
  autoStartSync = false,
}: WalletSidebarPanelProps) => {
  const { stats, syncState, swapStats } = summary;
  const tonNet = formatMoneyTonFromNanoton(swapStats.aggregate.tonNetNanoton);
  const jettonCount = swapStats.byJetton.length;
  const isActive = syncState?.status !== ChainSyncStatus.ERROR;
  const workchainHint = truncateMiddle(address, 5, 5);

  return (
    <div className={explorerStyles.card}>
      <div className={explorerStyles.cardBody}>
        <div>
          <span className="text-xs tracking-wide text-muted-foreground uppercase">Address</span>
          <div className="mt-1 flex items-start justify-between gap-2">
            <p className="flex-1 text-xs leading-relaxed text-foreground break-all">{address}</p>
            <div className="flex shrink-0 items-center gap-1">
              <CopyToClipboardButton
                value={address}
                className="flex size-7 items-center justify-center rounded-lg bg-explorer-surface-2"
              />
              <button
                type="button"
                className="flex size-7 items-center justify-center rounded-lg bg-explorer-surface-2 text-muted-foreground"
                aria-label="Show QR code"
                disabled
                title="QR code coming soon"
              >
                <QrCode className="size-3.5" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div className={explorerStyles.divider} />

        <div className="flex flex-col gap-3">
          <div className={explorerStyles.metricRow}>
            <span className={explorerStyles.metricLabel}>Balance (swap net TON)</span>
            <div>
              <span className={explorerStyles.metricValue}>{tonNet || "0 TON"}</span>
            </div>
          </div>
          <div className={explorerStyles.metricRow}>
            <span className={explorerStyles.metricLabel}>Tokens (tracked)</span>
            <div className="flex items-center gap-2">
              <span className={explorerStyles.metricValue}>{jettonCount}</span>
              {jettonCount > 0 && (
                <Link
                  href={getWalletPagePath(address, { tab: "tokens" })}
                  className="text-xs font-medium text-primary hover:underline"
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
        </div>

        <div className={explorerStyles.divider} />

        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn("size-2 rounded-full", isActive ? "bg-profit" : "bg-loss")}
              aria-hidden
            />
            <span className="text-xs text-muted-foreground">
              {isActive ? "Active" : "Error"}
            </span>
            <span className="text-xs text-muted-foreground">{workchainHint}</span>
          </div>
          <a
            href={`https://tonviewer.com/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            tonviewer.com
          </a>
        </div>

        <div className={explorerStyles.divider} />

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="text-muted-foreground">{stats.events} events</span>
          <span className="text-muted-foreground">{stats.actions} actions</span>
          {stats.incompleteEvents > 0 && (
            <span className="font-medium text-chart-5">
              Incomplete: {stats.incompleteEvents}
            </span>
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
