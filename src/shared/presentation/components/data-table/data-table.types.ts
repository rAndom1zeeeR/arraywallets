import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";

export interface DataTableExpandMeta {
  expandedRowIds: Record<string, boolean>;
  toggleExpandedRow: (rowId: string) => void;
}

declare module "@tanstack/react-table" {
  interface TableMeta<TData extends RowData> {
    expand?: DataTableExpandMeta;
  }

  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
    /** Hide column below this breakpoint (mobile-first) */
    hideBelow?: "sm" | "md" | "lg";
    /** Column text alignment */
    align?: "left" | "right";
  }
}
