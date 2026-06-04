import "@tanstack/react-table";
import type { RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    headerClassName?: string;
    cellClassName?: string;
    /** Hide column below this breakpoint (mobile-first) */
    hideBelow?: "sm" | "md" | "lg";
    /** Column text alignment */
    align?: "left" | "right";
  }
}
