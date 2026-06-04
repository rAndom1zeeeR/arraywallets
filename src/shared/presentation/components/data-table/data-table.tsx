"use client";

import { Fragment, type ReactNode } from "react";
import { flexRender, type Row, type Table as TanStackTable } from "@tanstack/react-table";
import {
  dataTableStyles,
  getResponsiveHideClass,
} from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

export interface DataTableProps<TData> {
  table: TanStackTable<TData>;
  className?: string;
  tableClassName?: string;
  theadClassName?: string;
  headerRowClassName?: string;
  headerCellClassName?: string;
  tbodyClassName?: string;
  bodyCellClassName?: string;
  renderSubComponent?: (row: Row<TData>) => ReactNode;
  /** When set, overrides TanStack row expansion (use with local expand state if getExpandedRowModel breaks sorting). */
  isRowExpanded?: (row: Row<TData>) => boolean;
  renderRow?: (row: Row<TData>, cells: ReactNode[]) => ReactNode;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  subRowClassName?: string;
  subRowCellClassName?: string;
  emptyMessage?: ReactNode;
}

function resolveAlignClass(align?: "left" | "right"): string {
  return align === "right" ? dataTableStyles.bodyCellRight : "";
}

function resolveHeaderAlignClass(align?: "left" | "right"): string {
  return align === "right" ? dataTableStyles.headerCellRight : "";
}

/**
 * Generic TanStack Table renderer with DropsTab styling and responsive columns.
 */
export function DataTable<TData>({
  table,
  className,
  tableClassName,
  theadClassName,
  headerRowClassName,
  headerCellClassName,
  tbodyClassName,
  bodyCellClassName,
  renderSubComponent,
  isRowExpanded,
  renderRow,
  getRowClassName,
  subRowClassName,
  subRowCellClassName,
  emptyMessage,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();

  return (
    <div className={cn(dataTableStyles.scroll, className)}>
      <table className={cn(dataTableStyles.table, tableClassName)}>
        <thead className={cn(dataTableStyles.thead, theadClassName)}>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className={cn(dataTableStyles.headerRow, headerRowClassName)}>
              {headerGroup.headers.map(header => {
                const meta = header.column.columnDef.meta;

                return (
                  <th
                    key={header.id}
                    className={cn(
                      dataTableStyles.headerCell,
                      resolveHeaderAlignClass(meta?.align),
                      getResponsiveHideClass(meta?.hideBelow),
                      headerCellClassName,
                      meta?.headerClassName
                    )}
                    colSpan={header.colSpan}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : header.column.getCanSort()
                            ? "none"
                            : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className={cn(dataTableStyles.tbody, tbodyClassName)}>
          {rows.length === 0 && emptyMessage ? (
            <tr>
              <td
                colSpan={visibleColumns.length}
                className={cn(dataTableStyles.emptyCell, bodyCellClassName)}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map(row => {
              const cells = row.getVisibleCells().map(cell => {
                const meta = cell.column.columnDef.meta;

                return (
                  <td
                    key={cell.id}
                    className={cn(
                      dataTableStyles.bodyCell,
                      resolveAlignClass(meta?.align),
                      getResponsiveHideClass(meta?.hideBelow),
                      bodyCellClassName,
                      meta?.cellClassName
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                );
              });

              const mainRow = renderRow ? (
                renderRow(row, cells)
              ) : (
                <tr key={row.id} className={cn(dataTableStyles.bodyRow, getRowClassName?.(row))}>
                  {cells}
                </tr>
              );

              return (
                <Fragment key={row.id}>
                  {mainRow}
                  {(isRowExpanded ? isRowExpanded(row) : row.getIsExpanded()) && renderSubComponent && (
                    <tr className={cn(dataTableStyles.subRow, subRowClassName)}>
                      <td
                        colSpan={row.getVisibleCells().length}
                        className={cn(dataTableStyles.subRowCell, subRowCellClassName)}
                      >
                        {renderSubComponent(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
