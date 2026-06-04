"use client";

import { Fragment, type ReactNode } from "react";
import { flexRender, type Row, type Table as TanStackTable } from "@tanstack/react-table";
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
  renderRow?: (row: Row<TData>, cells: ReactNode[]) => ReactNode;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  subRowClassName?: string;
  subRowCellClassName?: string;
  emptyMessage?: ReactNode;
}

/**
 * Generic TanStack Table renderer with optional expandable sub-rows and custom row rendering.
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
  renderRow,
  getRowClassName,
  subRowClassName,
  subRowCellClassName,
  emptyMessage,
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className={cn("w-full border-collapse", tableClassName)}>
        <thead className={theadClassName}>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className={headerRowClassName}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className={cn(headerCellClassName, header.column.columnDef.meta?.headerClassName)}
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
              ))}
            </tr>
          ))}
        </thead>
        <tbody className={tbodyClassName}>
          {rows.length === 0 && emptyMessage ? (
            <tr>
              <td colSpan={table.getAllColumns().length} className={bodyCellClassName}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map(row => {
              const cells = row.getVisibleCells().map(cell => (
                <td
                  key={cell.id}
                  className={cn(bodyCellClassName, cell.column.columnDef.meta?.cellClassName)}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ));

              const mainRow = renderRow ? (
                renderRow(row, cells)
              ) : (
                <tr key={row.id} className={getRowClassName?.(row)}>
                  {cells}
                </tr>
              );

              return (
                <Fragment key={row.id}>
                  {mainRow}
                  {row.getIsExpanded() && renderSubComponent && (
                    <tr className={subRowClassName}>
                      <td
                        colSpan={row.getVisibleCells().length}
                        className={subRowCellClassName}
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
