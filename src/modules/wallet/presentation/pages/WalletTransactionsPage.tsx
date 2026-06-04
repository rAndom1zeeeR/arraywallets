"use client";

import { useQuery } from "@tanstack/react-query";
import { SyncButton } from "@/modules/wallet/presentation/components/SyncButton";
import { SwapSummaryPanel } from "@/modules/swap/presentation/components/SwapSummaryPanel";
import { WalletPnlPanel } from "@/modules/jetton/presentation/pages/WalletPnlPanel";
import { walletEventsQueryOptions, walletSummaryQueryOptions } from "@/modules/wallet/presentation/hooks/wallet-query-options";
import { WalletPageTabs } from "@/modules/wallet/presentation/pages/WalletPageTabs";
import { WalletEventsTable } from "@/modules/wallet/presentation/pages/WalletEventsTable";
import type { WalletTabId } from "@/shared/lib/wallet-route.utils";
import { ChainSyncStatus } from "@/shared/constants/chain-prisma.enums";

function WalletTransactionsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-24 rounded-lg bg-gray-100 dark:bg-gray-900" />
      <div className="h-10 w-full rounded bg-gray-100 dark:bg-gray-900" />
      <div className="h-64 rounded-lg bg-gray-100 dark:bg-gray-900" />
    </div>
  );
}

export interface WalletTransactionsPageProps {
  address: string;
  activeTab: WalletTabId;
  currentPage: number;
  swapsOnly: boolean;
}

export function WalletTransactionsPage({
  address,
  activeTab,
  currentPage,
  swapsOnly,
}: WalletTransactionsPageProps) {
  const summaryQuery = useQuery(walletSummaryQueryOptions(address));
  const eventsQuery = useQuery({
    ...walletEventsQueryOptions(address, currentPage, swapsOnly),
    enabled: activeTab === "events",
  });

  const isSummaryLoading = summaryQuery.isPending;
  const isEventsLoading = activeTab === "events" && eventsQuery.isPending;
  const isLoading = isSummaryLoading || isEventsLoading;

  const isError =
    summaryQuery.isError || (activeTab === "events" && eventsQuery.isError);

  const errorMessage =
    (summaryQuery.error instanceof Error ? summaryQuery.error.message : null) ??
    (eventsQuery.error instanceof Error ? eventsQuery.error.message : null) ??
    "Failed to load wallet data";

  if (isLoading) {
    return (
      <main className="p-4">
        <WalletTransactionsSkeleton />
      </main>
    );
  }

  if (isError || !summaryQuery.data) {
    return (
      <main className="p-4">
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{errorMessage}</div>
      </main>
    );
  }

  if (activeTab === "events" && !eventsQuery.data) {
    return (
      <main className="p-4">
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{errorMessage}</div>
      </main>
    );
  }

  const { stats, syncState, swapStats } = summaryQuery.data;
  const isSyncing = syncState?.status === ChainSyncStatus.SYNCING;

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">TON Wallet</h1>
        <SyncButton address={address} isSyncing={isSyncing} incompleteEvents={stats.incompleteEvents} />
      </div>

      <div className="mb-4 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm text-gray-500">Address:</span>
            <code className="ml-2 font-mono text-sm">{address}</code>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          <span>
            DB: <strong>{stats.events}</strong> events, <strong>{stats.actions}</strong> actions
          </span>
          {stats.incompleteEvents > 0 && (
            <span className="text-red-600">
              Incomplete: {stats.incompleteEvents} — нажми <strong>Sync + repair</strong> справа вверху
            </span>
          )}
          {syncState && (
            <>
              <span>
                Status:{" "}
                <span
                  className={`font-medium ${
                    syncState.status === ChainSyncStatus.COMPLETED
                      ? "text-green-600"
                      : syncState.status === ChainSyncStatus.ERROR
                        ? "text-red-600"
                        : syncState.status === ChainSyncStatus.SYNCING
                          ? "text-blue-600"
                          : "text-gray-600"
                  }`}
                >
                  {syncState.status}
                </span>
              </span>
              {syncState.actionsSynced !== undefined && <span>Last sync actions: {syncState.actionsSynced}</span>}
              {syncState.lastTimestamp && (
                <span>Last sync: {new Date(syncState.lastTimestamp).toLocaleString()}</span>
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
            className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-700"
          >
            <h2 className="text-lg font-semibold">Swap PnL</h2>
            <p className="mt-1 text-sm text-gray-500">No swap actions in DB for this wallet yet.</p>
          </section>
        ) : (
          <WalletPnlPanel address={address} currentPage={currentPage} stats={swapStats} />
        ))}
    </main>
  );
}
