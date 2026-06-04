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
              <div className="font-medium text-foreground">{new Date(event.timestamp).toLocaleDateString()}</div>
              <div className="text-xs text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString()}</div>
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
          return (
            <>
              {tx.displayAmount ? (
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    tx.direction === "INCOMING" && "text-profit",
                    tx.direction === "OUTGOING" && "text-loss"
                  )}
                >
                  {tx.direction === "INCOMING" ? "+" : tx.direction === "OUTGOING" ? "-" : ""}
                  {tx.displayAmount}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              {(tx.type === "JETTON_SWAP" || tx.type === "INFERRED_SWAP") && (tx.tonIn || tx.tonOut) && (
                <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {tx.tonIn && <span className="text-loss">TON in: {formatTonFromNanoton(parseNanoton(String(tx.tonIn)))}</span>}
                  {tx.tonIn && tx.tonOut && " · "}
                  {tx.tonOut && (
                    <span className="text-profit">
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
        <p className="text-sm text-orange-400">
          Filter: <strong>JETTON_SWAP</strong>, <strong>INFERRED_SWAP</strong> on this page.{" "}
          <Link
            href={getWalletPagePath(address, { tab: "events" })}
            className="text-primary underline"
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
          <p className="mb-4 text-muted-foreground">
            {swapsOnly ? "No swap actions on this page." : "No events found in database."}
          </p>
          <p className="text-sm text-muted-foreground">
            {swapsOnly
              ? "Try another page or disable the swap filter."
              : 'Click "Sync" to fetch transactions from TON API.'}
          </p>
        </div>
      ) : (
        <DataTable
          table={table}
          tableClassName="min-w-[36rem] sm:min-w-full"
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
