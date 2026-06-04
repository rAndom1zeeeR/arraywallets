"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface DataTableSortHeaderProps<TData> {
  column: Column<TData, unknown>;
  label: ReactNode;
  className?: string;
}

/**
 * Clickable column header with sort direction indicator.
 */
export function DataTableSortHeader<TData>({ column, label, className }: DataTableSortHeaderProps<TData>) {
  if (!column.getCanSort()) {
    return <span className={className}>{label}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        "inline-flex items-center gap-1 transition-colors select-none",
        "hover:text-gray-900 dark:hover:text-gray-100",
        className
      )}
      aria-label={`Sort by ${typeof label === "string" ? label : column.id}`}
    >
      <span>{label}</span>
      {sorted === "asc" ? (
        <ArrowUp className="size-3.5 shrink-0" aria-hidden />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <ChevronsUpDown className="size-3.5 shrink-0 opacity-40" aria-hidden />
      )}
    </button>
  );
}
