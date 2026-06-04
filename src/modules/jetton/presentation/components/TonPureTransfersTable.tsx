"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { formatTonAmount } from "@/modules/jetton/domain/money-format.utils";
import type { TonTransferPnlItem } from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import { compareNullableNumber } from "@/shared/presentation/components/data-table/sorting.utils";
import { tonapiBaseUrl } from "@/shared/config/env.config";
import { buildTonviewerTransactionUrl } from "@/shared/lib/tonviewer";
import { dataTableStyles, pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

interface TonPureTransfersTableProps {
  items: TonTransferPnlItem[];
}

interface TonTransferTableRow {
  id: string;
  tonEventId: string;
  timestampIso: string;
  timestampMs: number;
  direction: TonTransferPnlItem["direction"];
  amountTon: number;
  signedAmountTon: number;
  purposeSortKey: string;
  counterparty: string | null;
}

type TransferSortColumn = "timestampMs" | "signedAmountTon" | "purposeSortKey";

interface TransferSortState {
  id: TransferSortColumn;
  desc: boolean;
}

interface TransferSortHeaderProps {
  label: string;
  columnId: TransferSortColumn;
  sort: TransferSortState;
  onSort: (columnId: TransferSortColumn) => void;
  className?: string;
}

const DEFAULT_SORT: TransferSortState = { id: "timestampMs", desc: true };

function getDirectionLabel(direction: TonTransferPnlItem["direction"]): string {
  return direction === "OUTGOING" ? "вывод" : "ввод";
}

function getPurposeSortKey(item: TonTransferPnlItem): string {
  const directionRank = item.direction === "INCOMING" ? "0" : "1";
  return `${directionRank}:${item.counterparty ?? ""}`;
}

function mapTransferToTableRow(item: TonTransferPnlItem): TonTransferTableRow {
  return {
    id: item.id,
    tonEventId: item.tonEventId,
    timestampIso: item.timestampIso,
    timestampMs: new Date(item.timestampIso).getTime(),
    direction: item.direction,
    amountTon: item.amountTon,
    signedAmountTon: item.direction === "OUTGOING" ? -item.amountTon : item.amountTon,
    purposeSortKey: getPurposeSortKey(item),
    counterparty: item.counterparty,
  };
}

function compareTransferRows(a: TonTransferTableRow, b: TonTransferTableRow, sort: TransferSortState): number {
  let result = 0;

  switch (sort.id) {
    case "timestampMs":
      result = compareNullableNumber(a.timestampMs, b.timestampMs);
      break;
    case "signedAmountTon":
      result = compareNullableNumber(a.signedAmountTon, b.signedAmountTon);
      break;
    case "purposeSortKey":
      result = a.purposeSortKey.localeCompare(b.purposeSortKey, "ru");
      break;
  }

  return sort.desc ? -result : result;
}

function sortTransferRows(rows: TonTransferTableRow[], sort: TransferSortState): TonTransferTableRow[] {
  return [...rows].sort((a, b) => compareTransferRows(a, b, sort));
}

function TransferSortHeader({ label, columnId, sort, onSort, className }: TransferSortHeaderProps) {
  const isActive = sort.id === columnId;

  const handleClick = () => {
    onSort(columnId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex cursor-pointer items-center gap-1 transition-colors select-none",
        "text-muted-foreground hover:text-foreground",
        isActive && "text-foreground",
        className
      )}
      aria-label={`Сортировать по ${label}`}
      aria-sort={isActive ? (sort.desc ? "descending" : "ascending") : "none"}
    >
      <span>{label}</span>
      {isActive ? (
        sort.desc ? (
          <ArrowDown className="size-3 shrink-0" aria-hidden />
        ) : (
          <ArrowUp className="size-3 shrink-0" aria-hidden />
        )
      ) : (
        <ChevronsUpDown className="size-3 shrink-0 opacity-40" aria-hidden />
      )}
    </button>
  );
}

function TransferAmountCell({ row }: { row: TonTransferTableRow }) {
  const formatted = formatTonAmount(row.amountTon);

  return (
    <span
      data-testid="transfer-amount"
      className={cn(
        "font-medium tabular-nums",
        row.direction === "OUTGOING" ? "text-loss" : "text-profit"
      )}
    >
      {row.direction === "OUTGOING" ? "−" : "+"}
      {formatted ?? `${row.amountTon} TON`}
    </span>
  );
}

function TransferDateCell({ row }: { row: TonTransferTableRow }) {
  const formattedDate = new Date(row.timestampIso).toLocaleString();
  const tonviewerHref = buildTonviewerTransactionUrl(row.tonEventId, null, tonapiBaseUrl);

  if (!tonviewerHref) {
    return (
      <time className="text-xs tabular-nums text-muted-foreground" dateTime={row.timestampIso}>
        {formattedDate}
      </time>
    );
  }

  return (
    <a
      href={tonviewerHref}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs tabular-nums text-primary hover:underline"
      aria-label={`Открыть перевод в Tonviewer · ${formattedDate}`}
    >
      <time dateTime={row.timestampIso}>{formattedDate}</time>
    </a>
  );
}

function TransferPurposeCell({ row }: { row: TonTransferTableRow }) {
  const directionLabel = getDirectionLabel(row.direction);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
      <span
        className={cn(
          "shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium",
          row.direction === "OUTGOING" ? "bg-loss/10 text-loss" : "bg-profit/10 text-profit"
        )}
      >
        {directionLabel}
      </span>
      {row.counterparty ? (
        <span className="truncate text-muted-foreground" title={row.counterparty}>
          {row.counterparty}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}

export function TonPureTransfersTable({ items }: TonPureTransfersTableProps) {
  const [sort, setSort] = useState<TransferSortState>(DEFAULT_SORT);

  const sortedRows = useMemo(() => {
    const rows = items.map(mapTransferToTableRow);
    return sortTransferRows(rows, sort);
  }, [items, sort]);

  const handleSort = useCallback((columnId: TransferSortColumn) => {
    setSort(current => {
      if (current.id === columnId) {
        return { id: columnId, desc: !current.desc };
      }

      return { id: columnId, desc: true };
    });
  }, []);

  return (
    <div className={cn(dataTableStyles.scroll, pageStyles.metricCard, "mt-4 max-h-96")}>
      <table
        data-testid="transfers-table"
        className={cn(dataTableStyles.table, "min-w-[36rem]")}
      >
        <thead className={dataTableStyles.thead}>
          <tr className={dataTableStyles.headerRow}>
            <th className={dataTableStyles.headerCell} scope="col">
              <TransferSortHeader label="Дата" columnId="timestampMs" sort={sort} onSort={handleSort} />
            </th>
            <th className={cn(dataTableStyles.headerCell, dataTableStyles.headerCellRight)} scope="col">
              <TransferSortHeader
                label="Сумма"
                columnId="signedAmountTon"
                sort={sort}
                onSort={handleSort}
                className="ml-auto"
              />
            </th>
            <th className={dataTableStyles.headerCell} scope="col">
              <TransferSortHeader label="Назначение" columnId="purposeSortKey" sort={sort} onSort={handleSort} />
            </th>
          </tr>
        </thead>
        <tbody className={dataTableStyles.tbody}>
          {sortedRows.map(row => (
            <tr key={row.id} className={dataTableStyles.bodyRow}>
              <td className={dataTableStyles.bodyCell}>
                <TransferDateCell row={row} />
              </td>
              <td className={cn(dataTableStyles.bodyCell, dataTableStyles.bodyCellRight)}>
                <TransferAmountCell row={row} />
              </td>
              <td className={dataTableStyles.bodyCell}>
                <TransferPurposeCell row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
