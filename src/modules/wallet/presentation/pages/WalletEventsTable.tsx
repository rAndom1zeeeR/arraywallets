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
import { EventTimeLabel } from "@/modules/wallet/presentation/components/EventTimeLabel";
import { EventsPagination } from "@/modules/wallet/presentation/components/EventsPagination";
import { resolveDisplayDetails } from "@/modules/wallet/domain/display-details.utils";
import { TonviewerAccountLink } from "@/modules/wallet/presentation/components/TonviewerAccountLink";
import { TonviewerTransactionLink } from "@/modules/wallet/presentation/components/TonviewerTransactionLink";
import { TransactionRawDetailsButton } from "@/modules/wallet/presentation/components/TransactionRawDetailsButton";
import { buildTransactionRawDetailsPayload } from "@/modules/wallet/domain/raw-details.utils";
import {
  formatEventActionAmount,
  formatTonLegIfNonZero,
} from "@/modules/jetton/domain/money-format.utils";
import type { WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";
import {
  getWalletActionTypeFilterLabel,
  getWalletDirectionFilterLabel,
  getWalletHistoryStatusFilterLabel,
  hasActiveHistoryFilters,
  WALLET_HISTORY_FILTER_ALL,
  type WalletHistoryFilters,
} from "@/modules/wallet/domain/wallet-events-filter.utils";
import { getWalletHistoryDateFilterLabel } from "@/modules/wallet/domain/wallet-history-date.utils";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import type { ChainActionDirectionValue } from "@/shared/constants/chain-prisma.enums";
import { WalletEventsMobileList } from "@/modules/wallet/presentation/components/WalletEventsMobileList";
import { DataTable } from "@/shared/presentation/components/data-table/data-table";
import { ResponsiveDataTable } from "@/shared/presentation/components/data-table/responsive-data-table";
import {
  dataTableStyles,
  getResponsiveHideClass,
} from "@/shared/presentation/components/data-table/data-table.styles";
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
  totalActions: number;
  totalPages: number;
  safePage: number;
  filters: WalletHistoryFilters;
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
    INCOMING: "bg-profit/10 text-profit",
    OUTGOING: "bg-loss/10 text-loss",
    SELF: "bg-muted text-muted-foreground",
    UNKNOWN: "bg-amber-500/10 text-amber-400",
  };

  const labels: Record<string, string> = {
    INCOMING: "← In",
    OUTGOING: "→ Out",
    SELF: "↻ Self",
    UNKNOWN: "?",
  };

  return (
    <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", styles[direction] ?? styles.UNKNOWN)}>
      {labels[direction] ?? direction}
    </span>
  );
}

function getActionTypeBadgeClass(type: string): string {
  if (type === "TON_TRANSFER") return "bg-primary/10 text-primary";
  if (type === "JETTON_TRANSFER") return "bg-purple-500/10 text-purple-400";
  if (type === "FLAWED_JETTON_TRANSFER") return "bg-amber-500/10 text-amber-400";
  if (type === "JETTON_SWAP") return "bg-orange-500/10 text-orange-400";
  if (type === "INFERRED_SWAP") return "bg-violet-500/10 text-violet-400";
  if (type === "JETTON_BURN") return "bg-loss/10 text-loss";
  if (type === "JETTON_MINT") return "bg-profit/10 text-profit";
  if (type === "DEPOSIT_STAKE") return "bg-teal-500/10 text-teal-400";
  if (type === "WITHDRAW_STAKE") return "bg-cyan-500/10 text-cyan-400";
  if (type === "SMART_CONTRACT_EXEC") return "bg-muted text-muted-foreground";
  return "bg-muted text-muted-foreground";
}

function getEventTimestampMs(event: WalletEventFlatRow["event"]): number {
  return new Date(event.timestamp).getTime();
}

function resolveEventCellClassName(
  meta: { align?: "left" | "right"; hideBelow?: "sm" | "md" | "lg"; cellClassName?: string } | undefined,
  extra?: string
): string {
  return cn(
    dataTableStyles.bodyCell,
    meta?.align === "right" && dataTableStyles.bodyCellRight,
    getResponsiveHideClass(meta?.hideBelow),
    meta?.cellClassName,
    extra
  );
}

const columnHelper = createColumnHelper<WalletEventFlatRow>();

export function WalletEventsTable({
  address,
  events,
  totalActions,
  totalPages,
  safePage,
  filters,
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
              <div className="font-medium text-foreground">{new Date(event.timestamp).toLocaleDateString()}</div>
              <EventTimeLabel timestamp={event.timestamp} className="text-xs text-muted-foreground" />
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
            <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", getActionTypeBadgeClass(tx.type))}>
              {tx.type.replace(/_/g, " ")}
            </span>
          );
        },
      }),
      columnHelper.accessor(row => row.action.direction ?? "", {
        id: "direction",
        header: ({ column }) => <DataTableSortHeader column={column} label="Direction" />,
        meta: { hideBelow: "md" },
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
          meta: { hideBelow: "lg" },
          cell: ({ row }) => {
            const tx = row.original.action;
            return (
              <div className="space-y-1">
                {tx.from && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">From: </span>
                    <TonviewerAccountLink
                      address={tx.from.rawAddress}
                      label={formatAddress(tx.from.rawAddress, 12)}
                    />
                    {tx.from.name && <span className="ml-1 text-muted-foreground">({tx.from.name})</span>}
                  </div>
                )}
                {tx.to && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">To: </span>
                    <TonviewerAccountLink address={tx.to.rawAddress} label={formatAddress(tx.to.rawAddress, 12)} />
                    {tx.to.name && <span className="ml-1 text-muted-foreground">({tx.to.name})</span>}
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
        meta: { align: "right" },
        cell: ({ row }) => {
          const tx = row.original.action;
          const amountText = formatEventActionAmount({
            type: tx.type,
            displayAmount: tx.displayAmount,
            amount: tx.amount,
            jetton: tx.jetton,
          });
          const tonInText = formatTonLegIfNonZero(tx.tonIn);
          const tonOutText = formatTonLegIfNonZero(tx.tonOut);

          return (
            <>
              {amountText ? (
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    tx.direction === "INCOMING" && "text-profit",
                    tx.direction === "OUTGOING" && "text-loss"
                  )}
                >
                  {tx.direction === "INCOMING" ? "+" : tx.direction === "OUTGOING" ? "-" : ""}
                  {amountText}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {(tx.type === "JETTON_SWAP" || tx.type === "INFERRED_SWAP") && (tonInText || tonOutText) && (
                <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {tonInText && <span className="text-loss">TON in: {tonInText}</span>}
                  {tonInText && tonOutText && " · "}
                  {tonOutText && <span className="text-profit">TON out: {tonOutText}</span>}
                </div>
              )}
            </>
          );
        },
      }),
      columnHelper.accessor(row => getActionDetailsText(row.action) ?? "", {
        id: "comments",
        header: ({ column }) => <DataTableSortHeader column={column} label="Comments" />,
        meta: { hideBelow: "md" },
        cell: ({ row }) => {
          const detailsText = getActionDetailsText(row.original.action);
          return detailsText ? (
            <div className="max-w-xs truncate text-xs text-muted-foreground" title={detailsText}>
              {detailsText}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      }),
      columnHelper.display({
        id: "details",
        header: "Details",
        enableSorting: false,
        meta: { align: "right", headerClassName: "w-20" },
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
    initialState: { sorting: [] },
    state: { sorting },
    onSortingChange: setSorting,
    enableSorting: true,
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
      {hasActiveHistoryFilters(filters) && (
        <p className="text-sm text-orange-400">
          Filters:{" "}
          {filters.actionType !== WALLET_HISTORY_FILTER_ALL && (
            <strong>{getWalletActionTypeFilterLabel(filters.actionType)}</strong>
          )}
          {filters.actionStatus !== WALLET_HISTORY_FILTER_ALL && (
            <>
              {filters.actionType !== WALLET_HISTORY_FILTER_ALL && " · "}
              <strong>{getWalletHistoryStatusFilterLabel(filters.actionStatus)}</strong>
            </>
          )}
          {filters.direction !== WALLET_HISTORY_FILTER_ALL && (
            <>
              {(filters.actionType !== WALLET_HISTORY_FILTER_ALL ||
                filters.actionStatus !== WALLET_HISTORY_FILTER_ALL) &&
                " · "}
              <strong>{getWalletDirectionFilterLabel(filters.direction)}</strong>
            </>
          )}
          {(filters.dateFrom !== null || filters.dateTo !== null) && (
            <>
              {(filters.actionType !== WALLET_HISTORY_FILTER_ALL ||
                filters.actionStatus !== WALLET_HISTORY_FILTER_ALL ||
                filters.direction !== WALLET_HISTORY_FILTER_ALL) &&
                " · "}
              <strong>{getWalletHistoryDateFilterLabel(filters)}</strong>
            </>
          )}
          .{" "}
          <Link
            href={getWalletPagePath(address, { tab: "events" })}
            className="text-primary underline"
          >
            Clear filters
          </Link>
        </p>
      )}

      {totalActions > 0 && (
        <EventsPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalActions={totalActions}
          address={address}
          filters={filters}
        />
      )}

      {events.length === 0 ? (
        <div className="py-8 text-center">
          <p className="mb-4 text-muted-foreground">
            {hasActiveHistoryFilters(filters)
              ? "No matching actions for this filter."
              : "No events found in database."}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasActiveHistoryFilters(filters)
              ? "Try another page or clear filters."
              : 'Click "Sync" to fetch transactions from TON API.'}
          </p>
        </div>
      ) : (
        <ResponsiveDataTable
          mobile={<WalletEventsMobileList rows={visibleRows.map(r => r.original)} />}
          desktop={
            <DataTable
              table={table}
              tableClassName="min-w-[36rem] lg:min-w-full"
              renderRow={row => {
            const flat = row.original;
            const span = rowSpanMeta.get(flat.rowKey);
            const isFirst = useRowSpan ? (span?.isFirst ?? flat.isFirstActionInEvent) : true;
            const eventActionCount = useRowSpan ? (span?.count ?? flat.eventActionCount) : 1;
            const isEventContinuation = useRowSpan && span !== undefined && !span.isFirst;

            return (
              <tr key={row.id} className={dataTableStyles.bodyRow}>
                {row.getVisibleCells().map(cell => {
                  const meta = cell.column.columnDef.meta;
                  const isDateColumn = cell.column.id === "date";

                  if (isDateColumn && useRowSpan && !isFirst) {
                    return null;
                  }

                  if (isDateColumn && useRowSpan && isFirst) {
                    return (
                      <td
                        key={cell.id}
                        rowSpan={eventActionCount}
                        className={resolveEventCellClassName(meta)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={cell.id}
                      className={resolveEventCellClassName(
                        meta,
                        isEventContinuation && cell.column.id === "type"
                          ? "border-t border-dashed border-border/60"
                          : undefined
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          }}
            />
          }
        />
      )}

      {totalActions > 0 && (
        <EventsPagination
          currentPage={safePage}
          totalPages={totalPages}
          totalActions={totalActions}
          address={address}
          filters={filters}
        />
      )}
    </div>
  );
}
