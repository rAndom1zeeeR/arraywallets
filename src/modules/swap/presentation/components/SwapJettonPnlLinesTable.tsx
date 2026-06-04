"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { JettonPnlLine } from "@/modules/swap/domain/swap-pnl.utils";
import { pnlClassNameFromBigint } from "@/modules/jetton/domain/pnl-display.utils";
import { DataTable } from "@/shared/presentation/components/data-table/data-table";
import "@/shared/presentation/components/data-table/data-table.types";
import { cn } from "@/shared/lib/utils";

interface SwapJettonPnlLinesTableProps {
  lines: JettonPnlLine[];
}

const columnHelper = createColumnHelper<JettonPnlLine>();

export function SwapJettonPnlLinesTable({ lines }: SwapJettonPnlLinesTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor(row => row.jetton.symbol, {
        id: "jetton",
        header: "Jetton",
        cell: info => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("spent", {
        header: "Spent",
        meta: { headerClassName: "text-red-600", cellClassName: "text-red-600 dark:text-red-400" },
      }),
      columnHelper.accessor("received", {
        header: "Received",
        meta: { headerClassName: "text-green-600", cellClassName: "text-green-600 dark:text-green-400" },
      }),
      columnHelper.accessor("net", {
        header: "Net",
        cell: info => (
          <span className={cn("font-medium", pnlClassNameFromBigint(info.row.original.netRaw))}>
            {info.getValue()}
          </span>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: lines,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.jetton.address,
  });

  return (
    <DataTable
      table={table}
      tableClassName="min-w-[28rem] text-sm"
      theadClassName="bg-sky-50 dark:bg-sky-950"
      headerRowClassName="border-b border-sky-200 text-left text-xs text-gray-500 uppercase dark:border-sky-900"
      headerCellClassName="px-2 py-1.5"
      getRowClassName={() => "border-b border-sky-100/80 dark:border-sky-900/50"}
      bodyCellClassName="px-2 py-1.5"
    />
  );
}
