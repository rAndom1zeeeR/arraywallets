"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SyncButton } from "@/features/sync-events/components/SyncButton";
import { EventsPagination } from "@/features/sync-events/components/EventsPagination";
import { resolveDisplayDetails } from "@/features/sync-events/lib/display-details.utils";
import { TonviewerAccountLink } from "@/features/sync-events/components/TonviewerAccountLink";
import { TonviewerTransactionLink } from "@/features/sync-events/components/TonviewerTransactionLink";
import { TransactionRawDetailsButton } from "@/features/sync-events/components/TransactionRawDetailsButton";
import { buildTransactionRawDetailsPayload } from "@/features/sync-events/lib/raw-details.utils";
import { formatTonFromNanoton, parseNanoton } from "@/features/sync-events/lib/ton-amount.utils";
import { SwapSummaryPanel } from "@/features/sync-events/components/SwapSummaryPanel";
import type { EventWithActions, WalletEventActionRow } from "@/features/sync-events/model/wallet-events.types";
import { walletEventsQueryOptions, walletSummaryQueryOptions } from "@/features/sync-events/hooks/wallet-query-options";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { ChainSyncStatus, type ChainActionDirectionValue } from "@/shared/constants/chain-prisma.enums";

function getActionDetailsText(action: WalletEventActionRow): string | undefined {
  return resolveDisplayDetails(
    action.displayDetails,
    action.displayAmount,
    action.direction as ChainActionDirectionValue | null
  );
}

function formatAddress(addr: string | null | undefined, maxLength: number = 16): string {
  if (!addr) return "—";
  if (addr.length <= maxLength) return addr;
  const half = Math.floor(maxLength / 2) - 1;
  return `${addr.slice(0, half)}…${addr.slice(-half)}`;
}

function getDirectionBadge(direction: string | null | undefined) {
  if (!direction) return null;

  const styles: Record<string, string> = {
    INCOMING: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    OUTGOING: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    SELF: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    UNKNOWN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  const labels: Record<string, string> = {
    INCOMING: "← In",
    OUTGOING: "→ Out",
    SELF: "↻ Self",
    UNKNOWN: "?",
  };

  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[direction] ?? styles.UNKNOWN}`}>
      {labels[direction] ?? direction}
    </span>
  );
}

function WalletTransactionsSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-24 rounded-lg bg-gray-100 dark:bg-gray-900" />
      <div className="h-40 rounded-lg bg-gray-100 dark:bg-gray-900" />
      <div className="h-64 rounded-lg bg-gray-100 dark:bg-gray-900" />
    </div>
  );
}

export interface WalletTransactionsPageProps {
  address: string;
  currentPage: number;
  swapsOnly: boolean;
}

export function WalletTransactionsPage({ address, currentPage, swapsOnly }: WalletTransactionsPageProps) {
  const summaryQuery = useQuery(walletSummaryQueryOptions(address));
  const eventsQuery = useQuery(walletEventsQueryOptions(address, currentPage, swapsOnly));

  const isLoading = summaryQuery.isPending || eventsQuery.isPending;
  const isError = summaryQuery.isError || eventsQuery.isError;
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

  if (isError || !summaryQuery.data || !eventsQuery.data) {
    return (
      <main className="p-4">
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">{errorMessage}</div>
      </main>
    );
  }

  const { stats, syncState, swapStats } = summaryQuery.data;
  const { totalEvents, totalPages, safePage, events: visibleEvents } = eventsQuery.data;
  const isSyncing = syncState?.status === ChainSyncStatus.SYNCING;

  return (
    <main className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">TON Wallet Transactions</h1>
        <SyncButton address={address} isSyncing={isSyncing} />
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
            <span className="text-red-600">Incomplete: {stats.incompleteEvents} (нажми Sync с repair)</span>
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
              {syncState.lastTimestamp && <span>Last sync: {new Date(syncState.lastTimestamp).toLocaleString()}</span>}
            </>
          )}
        </div>
      </div>

      <SwapSummaryPanel address={address} stats={swapStats} />

      {swapsOnly && (
        <p className="mb-3 text-sm text-orange-700 dark:text-orange-300">
          Filter: only <strong>JETTON_SWAP</strong> on this page.{" "}
          <Link href={getWalletPagePath(address)} className="text-sky-600 underline">
            Show all
          </Link>
        </p>
      )}

      {totalEvents > 0 && (
        <EventsPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalEvents={totalEvents}
          address={address}
          swapsOnly={swapsOnly}
        />
      )}

      {visibleEvents.length === 0 ? (
        <div className="py-8 text-center">
          <p className="mb-4 text-gray-500">
            {swapsOnly ? "No JETTON_SWAP on this page." : "No events found in database."}
          </p>
          <p className="text-sm text-gray-400">
            {swapsOnly
              ? "Try another page or disable the swap filter."
              : 'Click "Sync" to fetch transactions from TON API.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-sm font-medium">Date / Tx</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Type</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Direction</th>
                <th className="px-3 py-2 text-left text-sm font-medium">From / To</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Amount</th>
                <th className="px-3 py-2 text-left text-sm font-medium">Details</th>
                <th className="w-24 px-3 py-2 text-left text-sm font-medium">Raw</th>
              </tr>
            </thead>
            <tbody>
              {visibleEvents.map((event: EventWithActions) =>
                event.actions.map((tx: WalletEventActionRow, txIndex: number) => {
                  const detailsText = getActionDetailsText(tx);

                  return (
                    <tr
                      key={`${event.id}-${tx.id}`}
                      className={`border-b hover:bg-gray-50 dark:hover:bg-gray-900 ${
                        txIndex === 0 ? "" : "border-t border-dashed"
                      }`}
                    >
                      {txIndex === 0 && (
                        <td className="px-3 py-2 text-sm" rowSpan={event.actions.length}>
                          <div className="font-medium">{new Date(event.timestamp).toLocaleDateString()}</div>
                          <div className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</div>
                          <div className="mt-1">
                            <TonviewerTransactionLink tonEventId={event.tonEventId} rawData={event.rawData} />
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-2 text-sm">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-medium ${
                            tx.type === "TON_TRANSFER"
                              ? "bg-blue-100 text-blue-800"
                              : tx.type === "JETTON_TRANSFER"
                                ? "bg-purple-100 text-purple-800"
                                : tx.type === "FLAWED_JETTON_TRANSFER"
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                                  : tx.type === "JETTON_SWAP"
                                    ? "bg-orange-100 text-orange-800"
                                    : tx.type === "JETTON_BURN"
                                      ? "bg-red-100 text-red-800"
                                      : tx.type === "JETTON_MINT"
                                        ? "bg-green-100 text-green-800"
                                        : tx.type === "DEPOSIT_STAKE"
                                          ? "bg-teal-100 text-teal-800"
                                          : tx.type === "WITHDRAW_STAKE"
                                            ? "bg-cyan-100 text-cyan-800"
                                            : tx.type === "SMART_CONTRACT_EXEC"
                                              ? "bg-gray-100 text-gray-800"
                                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {tx.type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-sm">{getDirectionBadge(tx.direction)}</td>
                      <td className="px-3 py-2 text-sm">
                        <div className="space-y-1">
                          {tx.from && (
                            <div className="text-xs">
                              <span className="text-gray-500">From: </span>
                              <TonviewerAccountLink
                                address={tx.from.rawAddress}
                                label={formatAddress(tx.from.rawAddress, 12)}
                              />
                              {tx.from.name && <span className="ml-1 text-gray-600">({tx.from.name})</span>}
                            </div>
                          )}
                          {tx.to && (
                            <div className="text-xs">
                              <span className="text-gray-500">To: </span>
                              <TonviewerAccountLink
                                address={tx.to.rawAddress}
                                label={formatAddress(tx.to.rawAddress, 12)}
                              />
                              {tx.to.name && <span className="ml-1 text-gray-600">({tx.to.name})</span>}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {tx.displayAmount ? (
                          <span
                            className={`font-medium ${
                              tx.direction === "INCOMING"
                                ? "text-green-600"
                                : tx.direction === "OUTGOING"
                                  ? "text-red-600"
                                  : ""
                            }`}
                          >
                            {tx.direction === "INCOMING" ? "+" : tx.direction === "OUTGOING" ? "-" : ""}
                            {tx.displayAmount}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                        {tx.type === "JETTON_SWAP" && (tx.tonIn || tx.tonOut) && (
                          <div className="mt-1 text-xs text-gray-500">
                            {tx.tonIn && (
                              <span className="text-red-600 dark:text-red-400">
                                TON in: {formatTonFromNanoton(parseNanoton(String(tx.tonIn)))}
                              </span>
                            )}
                            {tx.tonIn && tx.tonOut && " · "}
                            {tx.tonOut && (
                              <span className="text-green-600 dark:text-green-400">
                                TON out: {formatTonFromNanoton(parseNanoton(String(tx.tonOut)))}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        {detailsText ? (
                          <div
                            className="max-w-xs truncate text-xs text-gray-600 dark:text-gray-400"
                            title={detailsText}
                          >
                            {detailsText}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm">
                        <TransactionRawDetailsButton
                          details={buildTransactionRawDetailsPayload({
                            event,
                            action: tx,
                          })}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalEvents > 0 && (
        <EventsPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalEvents={totalEvents}
          address={address}
          swapsOnly={swapsOnly}
        />
      )}
    </main>
  );
}
