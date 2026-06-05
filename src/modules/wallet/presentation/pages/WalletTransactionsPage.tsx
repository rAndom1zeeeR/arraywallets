"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SwapJettonBreakdownPanel } from "@/modules/swap/presentation/components/SwapJettonBreakdownPanel";
import { SwapRecentSwapsPanel } from "@/modules/swap/presentation/components/swap-recent-swaps-panel";
import { SwapStatsSidebarPanel } from "@/modules/swap/presentation/components/swap-stats-sidebar-panel";
import { WalletPnlPanel } from "@/modules/jetton/presentation/pages/WalletPnlPanel";
import { walletEventsQueryOptions, walletSummaryQueryOptions } from "@/modules/wallet/presentation/hooks/wallet-query-options";
import { WalletExplorerBreadcrumb } from "@/modules/wallet/presentation/components/wallet-explorer-breadcrumb";
import { WalletAccountBalancesPanel } from "@/modules/wallet/presentation/components/wallet-account-balances-panel";
import { WalletSidebarPanel } from "@/modules/wallet/presentation/components/wallet-sidebar-panel";
import { WalletTokenHoldings } from "@/modules/wallet/presentation/components/wallet-token-holdings";
import { WalletExplorerTabs } from "@/modules/wallet/presentation/components/wallet-explorer-tabs";
import { WalletExplorerHistoryTable } from "@/modules/wallet/presentation/components/wallet-explorer-history-table";
import { WalletExplorerHistoryMobileList } from "@/modules/wallet/presentation/components/wallet-explorer-history-mobile-list";
import { WalletExplorerPagination } from "@/modules/wallet/presentation/components/wallet-explorer-pagination";
import { WalletMobileSummaryCard } from "@/modules/wallet/presentation/components/wallet-mobile-summary-card";
import { WalletMobileToolbar } from "@/modules/wallet/presentation/components/wallet-mobile-toolbar";
import {
  getWalletActionTypeFilterLabel,
  getWalletDirectionFilterLabel,
  getWalletHistoryStatusFilterLabel,
  hasActiveHistoryFilters,
  WALLET_HISTORY_FILTER_ALL,
} from "@/modules/wallet/domain/wallet-events-filter.utils";
import { getWalletHistoryDateFilterLabel } from "@/modules/wallet/domain/wallet-history-date.utils";
import {
  parseWalletHistoryFiltersFromSearchParams,
  parseWalletTabParam,
} from "@/shared/lib/wallet-route.utils";
import { parsePageParam } from "@/modules/wallet/domain/wallet-page.utils";
import { ChainSyncStatus } from "@/shared/constants/chain-prisma.enums";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

function WalletTransactionsSkeleton() {
  return (
    <div className="animate-pulse space-y-4 px-4 py-6 sm:px-8">
      <div className="h-48 rounded-xl bg-explorer-surface-2" />
      <div className="h-64 rounded-xl bg-explorer-surface-2" />
    </div>
  );
}

export interface WalletTransactionsPageProps {
  address: string;
  autoStartSync?: boolean;
}

export function WalletTransactionsPage({
  address,
  autoStartSync = false,
}: WalletTransactionsPageProps) {
  const searchParams = useSearchParams();
  const currentPage = parsePageParam(searchParams.get("page") ?? undefined);
  const activeTab = parseWalletTabParam(searchParams.get("tab") ?? undefined);
  const historyFilters = useMemo(
    () => parseWalletHistoryFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const summaryQuery = useQuery(walletSummaryQueryOptions(address));
  const eventsQuery = useQuery({
    ...walletEventsQueryOptions(address, currentPage, historyFilters),
    enabled: activeTab === "events",
  });

  const isSummaryLoading = summaryQuery.isPending;
  const isEventsLoading =
    activeTab === "events" && (eventsQuery.isPending || eventsQuery.isPlaceholderData);
  const isLoading = isSummaryLoading || isEventsLoading;
  const isSyncing = summaryQuery.data?.syncState?.status === ChainSyncStatus.SYNCING;

  const isError =
    summaryQuery.isError || (activeTab === "events" && eventsQuery.isError);

  const errorMessage =
    (summaryQuery.error instanceof Error ? summaryQuery.error.message : null) ??
    (eventsQuery.error instanceof Error ? eventsQuery.error.message : null) ??
    "Failed to load wallet data";

  const stats = summaryQuery.data?.stats;
  const swapStats = summaryQuery.data?.swapStats;

  return (
    <div className={explorerStyles.page}>
      <WalletMobileToolbar />
      <WalletExplorerBreadcrumb address={address} />

      {isLoading && <WalletTransactionsSkeleton />}

      {!isLoading && (isError || !summaryQuery.data) && (
        <div className="mx-4 rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-loss sm:mx-8">
          {errorMessage}
        </div>
      )}

      {!isLoading && !isError && summaryQuery.data && stats && swapStats && (
        <div className={explorerStyles.content}>
          <WalletMobileSummaryCard
            address={address}
            summary={summaryQuery.data}
            isSyncing={Boolean(isSyncing)}
            autoStartSync={autoStartSync}
          />

          {activeTab === "swaps" && (
            <SwapStatsSidebarPanel
              address={address}
              stats={swapStats}
              className="mx-4 lg:hidden"
            />
          )}

          <aside className={cn(explorerStyles.sidebar, "hidden lg:flex")}>
            <WalletSidebarPanel
              address={address}
              summary={summaryQuery.data}
              isSyncing={Boolean(isSyncing)}
              autoStartSync={autoStartSync}
            />
            <WalletAccountBalancesPanel
              address={address}
              trackedJettonCount={swapStats.byJetton.length}
            />
            {activeTab === "swaps" && (
              <SwapStatsSidebarPanel address={address} stats={swapStats} />
            )}
          </aside>

          <div className={explorerStyles.main}>
            <div className="mx-4 mt-5 lg:mx-0 lg:mt-0">
              <WalletExplorerTabs
                address={address}
                activeTab={activeTab}
                currentPage={currentPage}
                filters={historyFilters}
                tokenCount={swapStats.byJetton.length}
              />
            </div>

            {activeTab === "events" && eventsQuery.data && (
              <div
                id="wallet-tabpanel-events"
                role="tabpanel"
                aria-labelledby="wallet-tab-events"
                className={cn(explorerStyles.tabPanel, "mt-4 space-y-0 lg:mt-4")}
              >
                {hasActiveHistoryFilters(historyFilters) && (
                  <p className="mb-3 hidden text-sm text-muted-foreground lg:block">
                    {historyFilters.actionType !== WALLET_HISTORY_FILTER_ALL && (
                      <span className="text-primary">
                        Type: {getWalletActionTypeFilterLabel(historyFilters.actionType)}
                      </span>
                    )}
                    {historyFilters.actionType !== WALLET_HISTORY_FILTER_ALL &&
                      historyFilters.actionStatus !== WALLET_HISTORY_FILTER_ALL &&
                      " · "}
                    {historyFilters.actionStatus !== WALLET_HISTORY_FILTER_ALL && (
                      <span className="text-primary">
                        Status: {getWalletHistoryStatusFilterLabel(historyFilters.actionStatus)}
                      </span>
                    )}
                    {(historyFilters.actionType !== WALLET_HISTORY_FILTER_ALL ||
                      historyFilters.actionStatus !== WALLET_HISTORY_FILTER_ALL) &&
                      historyFilters.direction !== WALLET_HISTORY_FILTER_ALL &&
                      " · "}
                    {historyFilters.direction !== WALLET_HISTORY_FILTER_ALL && (
                      <span className="text-primary">
                        Direction: {getWalletDirectionFilterLabel(historyFilters.direction)}
                      </span>
                    )}
                    {(historyFilters.dateFrom !== null || historyFilters.dateTo !== null) && (
                      <>
                        {(historyFilters.actionType !== WALLET_HISTORY_FILTER_ALL ||
                          historyFilters.actionStatus !== WALLET_HISTORY_FILTER_ALL ||
                          historyFilters.direction !== WALLET_HISTORY_FILTER_ALL) &&
                          " · "}
                        <span className="text-primary">
                          Date: {getWalletHistoryDateFilterLabel(historyFilters)}
                        </span>
                      </>
                    )}
                  </p>
                )}
                <WalletExplorerHistoryMobileList
                  events={eventsQuery.data.events}
                  className="lg:hidden"
                />
                <div className="hidden lg:block">
                  <WalletExplorerHistoryTable events={eventsQuery.data.events} />
                </div>
                <WalletExplorerPagination
                  address={address}
                  currentPage={eventsQuery.data.safePage}
                  totalPages={eventsQuery.data.totalPages}
                  totalActions={eventsQuery.data.totalActions}
                  filters={historyFilters}
                  className="mx-4 lg:mx-0"
                />
              </div>
            )}

            {activeTab === "events" && !eventsQuery.data && !eventsQuery.isPending && (
              <div className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-loss">
                {errorMessage}
              </div>
            )}

            {activeTab === "swaps" && (
              <div
                id="wallet-tabpanel-swaps"
                role="tabpanel"
                aria-labelledby="wallet-tab-swaps"
                className={cn(explorerStyles.tabPanel, "mt-4 space-y-4 lg:mt-4")}
              >
                <SwapJettonBreakdownPanel stats={swapStats} className="mx-4 lg:mx-0" />
                <SwapRecentSwapsPanel swaps={swapStats.swaps} className="mx-4 lg:mx-0" />
              </div>
            )}

            {activeTab === "pnl" &&
              (swapStats.aggregate.swapCount === 0 ? (
                <section
                  id="wallet-tabpanel-pnl"
                  role="tabpanel"
                  aria-labelledby="wallet-tab-pnl"
                  className={cn(explorerStyles.tabPanel, explorerStyles.card, "mx-4 p-5 lg:mx-0")}
                >
                  <h2 className="text-lg font-semibold text-foreground">Swap PnL</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No swap actions in DB for this wallet yet.
                  </p>
                </section>
              ) : (
                <div
                  id="wallet-tabpanel-pnl"
                  role="tabpanel"
                  aria-labelledby="wallet-tab-pnl"
                  className={cn(explorerStyles.tabPanel, explorerStyles.card, "mx-4 p-5 lg:mx-0")}
                >
                  <WalletPnlPanel address={address} currentPage={currentPage} stats={swapStats} />
                </div>
              ))}

            {activeTab === "tokens" && (
              <div
                id="wallet-tabpanel-tokens"
                role="tabpanel"
                aria-labelledby="wallet-tab-tokens"
                className={cn(explorerStyles.tabPanel, "mx-4 lg:mx-0")}
              >
                <WalletTokenHoldings
                  holdings={swapStats.byJetton}
                  totalCount={swapStats.byJetton.length}
                  showAll
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
