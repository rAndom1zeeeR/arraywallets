"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SyncButton } from "@/modules/wallet/presentation/components/SyncButton";
import { SwapSummaryPanel } from "@/modules/swap/presentation/components/SwapSummaryPanel";
import { WalletPnlPanel } from "@/modules/jetton/presentation/pages/WalletPnlPanel";
import { walletEventsQueryOptions, walletSummaryQueryOptions } from "@/modules/wallet/presentation/hooks/wallet-query-options";
import { WalletPageTabs } from "@/modules/wallet/presentation/pages/WalletPageTabs";
import { WalletEventsTable } from "@/modules/wallet/presentation/pages/WalletEventsTable";
import type { WalletTabId } from "@/shared/lib/wallet-route.utils";
import { ChainSyncStatus } from "@/shared/constants/chain-prisma.enums";
import { pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

function WalletTransactionsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-1/3 rounded-lg bg-secondary" />
      <div className="h-24 rounded-lg bg-secondary" />
      <div className="h-10 w-full rounded-lg bg-secondary" />
      <div className="h-64 rounded-lg bg-secondary" />
    </div>
  );
}

export interface WalletTransactionsPageProps {
  address: string;
  activeTab: WalletTabId;
  currentPage: number;
  swapsOnly: boolean;
  autoStartSync?: boolean;
}

export function WalletTransactionsPage({
  address,
  activeTab,
  currentPage,
  swapsOnly,
  autoStartSync = false,
}: WalletTransactionsPageProps) {
  const summaryQuery = useQuery(walletSummaryQueryOptions(address));
  const eventsQuery = useQuery({
    ...walletEventsQueryOptions(address, currentPage, swapsOnly),
    enabled: activeTab === "events",
  });

  const isSummaryLoading = summaryQuery.isPending;
  const isEventsLoading = activeTab === "events" && eventsQuery.isPending;
  const isLoading = isSummaryLoading || isEventsLoading;
  const isSyncing = summaryQuery.data?.syncState?.status === ChainSyncStatus.SYNCING;

  const isError =
    summaryQuery.isError || (activeTab === "events" && eventsQuery.isError);

  const errorMessage =
    (summaryQuery.error instanceof Error ? summaryQuery.error.message : null) ??
    (eventsQuery.error instanceof Error ? eventsQuery.error.message : null) ??
    "Failed to load wallet data";

  const stats = summaryQuery.data?.stats;
  const syncState = summaryQuery.data?.syncState;
  const swapStats = summaryQuery.data?.swapStats;

  return (
    <main className={pageStyles.main}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/wallets" className="mb-2 inline-block text-sm text-primary hover:underline">
            ← Все кошельки
          </Link>
          <h1 className={pageStyles.pageTitle}>TON Wallet</h1>
          <p className="mt-1 text-sm text-muted-foreground">Portfolio tracker & transaction history</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <SyncButton
            address={address}
            isSyncing={Boolean(isSyncing)}
            incompleteEvents={stats?.incompleteEvents ?? 0}
            historyComplete={syncState?.historyComplete ?? false}
            autoStart={autoStartSync}
          />
        </div>
      </div>

      {isLoading && <WalletTransactionsSkeleton />}

      {!isLoading && (isError || !summaryQuery.data) && (
        <div className="rounded-lg border border-loss/30 bg-loss/10 px-4 py-3 text-loss">{errorMessage}</div>
      )}

      {!isLoading && !isError && summaryQuery.data && activeTab === "events" && !eventsQuery.data && (
        <div className="rounded-lg border border-loss/30 bg-loss/10 px-4 py-3 text-loss">{errorMessage}</div>
      )}

      {!isLoading && !isError && summaryQuery.data && stats && swapStats && (
        <>
          <div className={cn(pageStyles.infoCard, "mb-6")}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Address</span>
                <code className="mt-1 block break-all font-mono text-sm text-foreground">{address}</code>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>
                DB: <strong className="text-foreground">{stats.events}</strong> events,{" "}
                <strong className="text-foreground">{stats.actions}</strong> actions
              </span>
              {stats.incompleteEvents > 0 && (
                <span className="text-loss">
                  Incomplete: {stats.incompleteEvents} — нажми <strong>Sync + repair</strong>
                </span>
              )}
              {syncState && (
                <>
                  <span>
                    Status:{" "}
                    <span
                      className={cn(
                        "font-medium",
                        syncState.status === ChainSyncStatus.COMPLETED && "text-profit",
                        syncState.status === ChainSyncStatus.ERROR && "text-loss",
                        syncState.status === ChainSyncStatus.SYNCING && "text-primary",
                        syncState.status !== ChainSyncStatus.COMPLETED &&
                          syncState.status !== ChainSyncStatus.ERROR &&
                          syncState.status !== ChainSyncStatus.SYNCING &&
                          "text-muted-foreground"
                      )}
                    >
                      {syncState.status}
                    </span>
                  </span>
                  {syncState.actionsSynced !== undefined && (
                    <span>Last sync actions: {syncState.actionsSynced}</span>
                  )}
                  {syncState.lastTimestamp && (
                    <span>Last sync: {new Date(syncState.lastTimestamp).toLocaleString()}</span>
                  )}
                  {syncState.historyComplete && (
                    <span className="text-profit">History complete — sync pulls new txs only</span>
                  )}
                </>
              )}
            </div>
          </div>

          <WalletPageTabs
            address={address}
            activeTab={activeTab}
            currentPage={currentPage}
            swapsOnly={swapsOnly}
          />

          {activeTab === "events" && eventsQuery.data && (
            <WalletEventsTable
              address={address}
              events={eventsQuery.data.events}
              totalEvents={eventsQuery.data.totalEvents}
              totalPages={eventsQuery.data.totalPages}
              safePage={eventsQuery.data.safePage}
              swapsOnly={swapsOnly}
            />
          )}

          {activeTab === "swaps" && <SwapSummaryPanel address={address} stats={swapStats} />}

          {activeTab === "pnl" &&
            (swapStats.aggregate.swapCount === 0 ? (
              <section
                id="wallet-tabpanel-pnl"
                role="tabpanel"
                aria-labelledby="wallet-tab-pnl"
                className={cn(pageStyles.section, "border-dashed")}
              >
                <h2 className={pageStyles.sectionTitle}>Swap PnL</h2>
                <p className={pageStyles.sectionSubtitle}>No swap actions in DB for this wallet yet.</p>
              </section>
            ) : (
              <WalletPnlPanel address={address} currentPage={currentPage} stats={swapStats} />
            ))}
        </>
      )}
    </main>
  );
}
