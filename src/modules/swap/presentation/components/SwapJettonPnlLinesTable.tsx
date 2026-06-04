"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { formatMoneyJetton } from "@/modules/jetton/domain/money-format.utils";
import type { JettonPnlLine } from "@/modules/swap/domain/swap-pnl.utils";
import { pnlClassNameFromBigint } from "@/modules/jetton/domain/pnl-display.utils";
import { DataTable } from "@/shared/presentation/components/data-table/data-table";
import { DataTableSortHeader } from "@/shared/presentation/components/data-table/sortable-header";
import { createBigintSortingFn } from "@/shared/presentation/components/data-table/sorting.utils";
import "@/shared/presentation/components/data-table/data-table.types";
import { cn } from "@/shared/lib/utils";

interface SwapJettonPnlLinesTableProps {
  lines: JettonPnlLine[];
}

const columnHelper = createColumnHelper<JettonPnlLine>();

export function SwapJettonPnlLinesTable({ lines }: SwapJettonPnlLinesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor(row => row.jetton.symbol.toLowerCase(), {
        id: "jetton",
        header: ({ column }) => <DataTableSortHeader column={column} label="Jetton" />,
        cell: info => <span className="font-semibold text-foreground">{info.row.original.jetton.symbol}</span>,
      }),
      columnHelper.accessor("spentRaw", {
        id: "spent",
        header: ({ column }) => <DataTableSortHeader column={column} label="Spent" className="text-loss" />,
        sortingFn: createBigintSortingFn("spent"),
        meta: { align: "right", headerClassName: "text-loss", cellClassName: "text-loss tabular-nums" },
        cell: info =>
          formatMoneyJetton(
            info.row.original.spentRaw,
            info.row.original.jetton.decimals,
            info.row.original.jetton.symbol
          ),
      }),
      columnHelper.accessor("receivedRaw", {
        id: "received",
        header: ({ column }) => <DataTableSortHeader column={column} label="Received" className="text-profit" />,
        sortingFn: createBigintSortingFn("received"),
        meta: { align: "right", headerClassName: "text-profit", cellClassName: "text-profit tabular-nums" },
        cell: info =>
          formatMoneyJetton(
            info.row.original.receivedRaw,
            info.row.original.jetton.decimals,
            info.row.original.jetton.symbol
          ),
      }),
      columnHelper.accessor("netRaw", {
        id: "net",
        header: ({ column }) => <DataTableSortHeader column={column} label="Net" />,
        sortingFn: createBigintSortingFn("net"),
        meta: { align: "right" },
        cell: info => (
          <span className={cn("font-medium tabular-nums", pnlClassNameFromBigint(info.row.original.netRaw))}>
            {formatMoneyJetton(
              info.row.original.netRaw,
              info.row.original.jetton.decimals,
              info.row.original.jetton.symbol
            )}
          </span>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: lines,
    columns,
    initialState: { sorting: [{ id: "net", desc: true }] },
    enableSorting: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => row.jetton.address,
  });

  const visibleLines = table.getRowModel().rows.map(r => r.original);

  return (
    <>
      <ul className="divide-y divide-border/60 md:hidden" role="list" aria-label="Jetton PnL lines">
        {visibleLines.map(line => (
          <li key={line.jetton.address} className="py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-foreground">{line.jetton.symbol}</span>
              <span className={cn("text-sm font-medium tabular-nums", pnlClassNameFromBigint(line.netRaw))}>
                {formatMoneyJetton(line.netRaw, line.jetton.decimals, line.jetton.symbol)}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between text-xs tabular-nums">
              <span className="text-loss">
                − {formatMoneyJetton(line.spentRaw, line.jetton.decimals, line.jetton.symbol)}
              </span>
              <span className="text-profit">
                + {formatMoneyJetton(line.receivedRaw, line.jetton.decimals, line.jetton.symbol)}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <DataTable table={table} tableClassName="min-w-[20rem]" />
      </div>
    </>
  );
}
