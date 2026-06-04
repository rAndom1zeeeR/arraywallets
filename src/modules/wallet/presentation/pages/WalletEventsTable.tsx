"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  flexRender,
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { EventsPagination } from "@/modules/wallet/presentation/components/EventsPagination";
import { resolveDisplayDetails } from "@/modules/wallet/domain/display-details.utils";
import { TonviewerAccountLink } from "@/modules/wallet/presentation/components/TonviewerAccountLink";
import { TonviewerTransactionLink } from "@/modules/wallet/presentation/components/TonviewerTransactionLink";
import { TransactionRawDetailsButton } from "@/modules/wallet/presentation/components/TransactionRawDetailsButton";
import { buildTransactionRawDetailsPayload } from "@/modules/wallet/domain/raw-details.utils";
import { formatTonFromNanoton, parseNanoton } from "@/shared/lib/ton/ton-amount.utils";
import type { WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import type { ChainActionDirectionValue } from "@/shared/constants/chain-prisma.enums";
import { DataTable } from "@/shared/presentation/components/data-table/data-table";
import { DataTableSortHeader } from "@/shared/presentation/components/data-table/sortable-header";
import {
  buildEventRowSpanMeta,
  flattenEvents,
  type WalletEventFlatRow,
} from "@/modules/wallet/presentation/pages/wallet-events-table.utils";
import "@/shared/presentation/components/data-table/data-table.types";
import { cn } from "@/shared/lib/utils";

export type { WalletEventFlatRow };

export interface WalletEventsTableProps {
  address: string;
  events: import("@/modules/wallet/domain/wallet-events.types").EventWithActions[];
  totalEvents: number;
  totalPages: number;
  safePage: number;
  swapsOnly: boolean;
}

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

function getActionTypeBadgeClass(type: string): string {
  if (type === "TON_TRANSFER") return "bg-blue-100 text-blue-800";
  if (type === "JETTON_TRANSFER") return "bg-purple-100 text-purple-800";
  if (type === "FLAWED_JETTON_TRANSFER") return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  if (type === "JETTON_SWAP") return "bg-orange-100 text-orange-800";
  if (type === "INFERRED_SWAP") return "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200";
  if (type === "JETTON_BURN") return "bg-red-100 text-red-800";
  if (type === "JETTON_MINT") return "bg-green-100 text-green-800";
  if (type === "DEPOSIT_STAKE") return "bg-teal-100 text-teal-800";
  if (type === "WITHDRAW_STAKE") return "bg-cyan-100 text-cyan-800";
  if (type === "SMART_CONTRACT_EXEC") return "bg-gray-100 text-gray-800";
  return "bg-gray-100 text-gray-800";
}

function getEventTimestampMs(event: WalletEventFlatRow["event"]): number {
  return new Date(event.timestamp).getTime();
}

const columnHelper = createColumnHelper<WalletEventFlatRow>();

export function WalletEventsTable({
  address,
  events,
  totalEvents,
  totalPages,
  safePage,
  swapsOnly,
}: WalletEventsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const tableData = useMemo(() => flattenEvents(events), [events]);

  const columns = useMemo(
    () => [
      columnHelper.accessor(row => getEventTimestampMs(row.event), {
        id: "date",
        header: ({ column }) => <DataTableSortHeader column={column} label="Date / Tx" />,
        sortingFn: (rowA, rowB) => {
          const tsA = getEventTimestampMs(rowA.original.event);
          const tsB = getEventTimestampMs(rowB.original.event);
          if (tsA !== tsB) {
            return tsA - tsB;
          }

          return rowA.original.action.orderIndex - rowB.original.action.orderIndex;
        },
        cell: ({ row }) => {
          const { event } = row.original;

          return (
            <>
              <div className="font-medium">{new Date(event.timestamp).toLocaleDateString()}</div>
              <div className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</div>
              <div className="mt-1">
                <TonviewerTransactionLink tonEventId={event.tonEventId} rawData={event.rawData} />
              </div>
            </>
          );
        },
      }),
      columnHelper.accessor(row => row.action.type, {
        id: "type",
        header: ({ column }) => <DataTableSortHeader column={column} label="Type" />,
        cell: ({ row }) => {
          const tx = row.original.action;
          return (
            <span className={cn("rounded px-2 py-0.5 text-xs font-medium", getActionTypeBadgeClass(tx.type))}>
              {tx.type.replace(/_/g, " ")}
            </span>
          );
        },
      }),
      columnHelper.accessor(row => row.action.direction ?? "", {
        id: "direction",
        header: ({ column }) => <DataTableSortHeader column={column} label="Direction" />,
        cell: ({ row }) => getDirectionBadge(row.original.action.direction),
      }),
      columnHelper.accessor(
        row =>
          [row.action.from?.rawAddress, row.action.from?.name, row.action.to?.rawAddress, row.action.to?.name]
            .filter(Boolean)
            .join(" "),
        {
          id: "parties",
          header: ({ column }) => <DataTableSortHeader column={column} label="From / To" />,
          cell: ({ row }) => {
            const tx = row.original.action;
            return (
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
                    <TonviewerAccountLink address={tx.to.rawAddress} label={formatAddress(tx.to.rawAddress, 12)} />
                    {tx.to.name && <span className="ml-1 text-gray-600">({tx.to.name})</span>}
                  </div>
                )}
              </div>
            );
          },
        }
      ),
      columnHelper.accessor(row => row.action.displayAmount ?? "", {
        id: "amount",
        header: ({ column }) => <DataTableSortHeader column={column} label="Amount" />,
        cell: ({ row }) => {
          const tx = row.original.action;
          return (
            <>
              {tx.displayAmount ? (
                <span
                  className={cn(
                    "font-medium",
                    tx.direction === "INCOMING" && "text-green-600",
                    tx.direction === "OUTGOING" && "text-red-600"
                  )}
                >
                  {tx.direction === "INCOMING" ? "+" : tx.direction === "OUTGOING" ? "-" : ""}
                  {tx.displayAmount}
                </span>
              ) : (
                <span className="text-gray-400">—</span>
              )}
              {(tx.type === "JETTON_SWAP" || tx.type === "INFERRED_SWAP") && (tx.tonIn || tx.tonOut) && (
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
            </>
          );
        },
      }),
      columnHelper.accessor(row => getActionDetailsText(row.action) ?? "", {
        id: "comments",
        header: ({ column }) => <DataTableSortHeader column={column} label="Comments" />,
        cell: ({ row }) => {
          const detailsText = getActionDetailsText(row.original.action);
          return detailsText ? (
            <div className="max-w-xs truncate text-xs text-gray-600 dark:text-gray-400" title={detailsText}>
              {detailsText}
            </div>
          ) : (
            <span className="text-gray-400">—</span>
          );
        },
      }),
      columnHelper.display({
        id: "details",
        header: "Details",
        enableSorting: false,
        meta: { headerClassName: "w-24" },
        cell: ({ row }) => (
          <TransactionRawDetailsButton
            details={buildTransactionRawDetailsPayload({
              event: row.original.event,
              action: row.original.action,
            })}
          />
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.rowKey,
  });

  const visibleRows = table.getRowModel().rows;
  const rowSpanMeta = useMemo(() => buildEventRowSpanMeta(visibleRows), [visibleRows]);
  const useRowSpan = sorting.length === 0 || (sorting.length === 1 && sorting[0]?.id === "date");

  return (
    <div
      id="wallet-tabpanel-events"
      role="tabpanel"
      aria-labelledby="wallet-tab-events"
      className="space-y-4"
    >
      {swapsOnly && (
        <p className="text-sm text-orange-700 dark:text-orange-300">
          Filter: <strong>JETTON_SWAP</strong>, <strong>INFERRED_SWAP</strong> on this page.{" "}
          <Link
            href={getWalletPagePath(address, { tab: "events" })}
            className="text-sky-600 underline dark:text-sky-400"
          >
            Show all events
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

      {events.length === 0 ? (
        <div className="py-8 text-center">
          <p className="mb-4 text-gray-500">
            {swapsOnly ? "No swap actions on this page." : "No events found in database."}
          </p>
          <p className="text-sm text-gray-400">
            {swapsOnly
              ? "Try another page or disable the swap filter."
              : 'Click "Sync" to fetch transactions from TON API.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <DataTable
            table={table}
            theadClassName="bg-gray-100 dark:bg-gray-800"
            headerCellClassName="px-3 py-2 text-left text-sm font-medium"
            getRowClassName={row => {
              const span = rowSpanMeta.get(row.original.rowKey);
              return cn(
                "border-b hover:bg-gray-50 dark:hover:bg-gray-900",
                useRowSpan && span && !span.isFirst && "border-t border-dashed"
              );
            }}
            bodyCellClassName="px-3 py-2 text-sm"
            renderRow={(row, cells) => {
              const flat = row.original;
              const span = rowSpanMeta.get(flat.rowKey);
              const isFirst = useRowSpan ? (span?.isFirst ?? flat.isFirstActionInEvent) : true;
              const eventActionCount = useRowSpan ? (span?.count ?? flat.eventActionCount) : 1;

              return (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b hover:bg-gray-50 dark:hover:bg-gray-900",
                    useRowSpan && span && !span.isFirst && "border-t border-dashed"
                  )}
                >
                  {row.getVisibleCells().map((cell, cellIndex) => {
                    if (cell.column.id === "date" && useRowSpan && !isFirst) {
                      return null;
                    }

                    if (cell.column.id === "date" && useRowSpan && isFirst) {
                      return (
                        <td key={cell.id} className="px-3 py-2 text-sm" rowSpan={eventActionCount}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    }

                    return cells[cellIndex];
                  })}
                </tr>
              );
            }}
          />
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
    </div>
  );
}
