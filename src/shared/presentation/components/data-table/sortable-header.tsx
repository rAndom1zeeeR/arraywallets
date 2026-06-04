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
 * Clickable column header with sort direction indicator (DropsTab style).
 */
export function DataTableSortHeader<TData>({ column, label, className }: DataTableSortHeaderProps<TData>) {
  if (!column.getCanSort()) {
    return <span className={className}>{label}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={event => {
        column.toggleSorting(undefined, event.shiftKey);
      }}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 transition-colors select-none",
        "text-muted-foreground hover:text-foreground",
        sorted && "text-foreground",
        className
      )}
      aria-label={`Sort by ${typeof label === "string" ? label : column.id}`}
    >
      <span>{label}</span>
      {sorted === "asc" ? (
        <ArrowUp className="size-3 shrink-0" aria-hidden />
      ) : sorted === "desc" ? (
        <ArrowDown className="size-3 shrink-0" aria-hidden />
      ) : (
        <ChevronsUpDown className="size-3 shrink-0 opacity-40" aria-hidden />
      )}
    </button>
  );
}
