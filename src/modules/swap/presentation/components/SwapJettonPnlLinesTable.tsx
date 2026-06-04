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
        cell: info => <span className="font-semibold text-foreground">{info.getValue()}</span>,
      }),
      columnHelper.accessor("spent", {
        header: "Spent",
        meta: { align: "right", headerClassName: "text-loss", cellClassName: "text-loss tabular-nums" },
      }),
      columnHelper.accessor("received", {
        header: "Received",
        meta: { align: "right", headerClassName: "text-profit", cellClassName: "text-profit tabular-nums" },
      }),
      columnHelper.accessor("net", {
        header: "Net",
        meta: { align: "right" },
        cell: info => (
          <span className={cn("font-medium tabular-nums", pnlClassNameFromBigint(info.row.original.netRaw))}>
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

  return <DataTable table={table} tableClassName="min-w-[20rem]" />;
}
