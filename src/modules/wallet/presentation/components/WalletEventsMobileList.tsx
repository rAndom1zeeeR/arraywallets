"use client";

import { getExplorerDateGroupLabel } from "@/modules/wallet/domain/wallet-event-display.utils";
import {
  WalletExplorerHistoryMobileGroupHeader,
  WalletExplorerHistoryMobileRow,
} from "@/modules/wallet/presentation/components/wallet-explorer-history-mobile-row";
import type { WalletEventFlatRow } from "@/modules/wallet/presentation/pages/wallet-events-table.utils";

interface WalletEventsMobileListProps {
  rows: WalletEventFlatRow[];
}

function buildGroupedRows(rows: WalletEventFlatRow[]): Array<
  | { kind: "header"; label: string; key: string }
  | { kind: "item"; row: WalletEventFlatRow; key: string }
> {
  const result: Array<
    | { kind: "header"; label: string; key: string }
    | { kind: "item"; row: WalletEventFlatRow; key: string }
  > = [];
  let lastGroupLabel: string | null = null;

  for (const row of rows) {
    const label = getExplorerDateGroupLabel(row.event.timestamp);
    if (label !== lastGroupLabel) {
      result.push({ kind: "header", label, key: `h-${row.event.id}-${label}` });
      lastGroupLabel = label;
    }
    result.push({ kind: "item", row, key: row.rowKey });
  }

  return result;
}

export function WalletEventsMobileList({ rows }: WalletEventsMobileListProps) {
  const grouped = buildGroupedRows(rows);

  return (
    <div className="flex flex-col" role="list" aria-label="Wallet events">
      {grouped.map(entry => {
        if (entry.kind === "header") {
          return <WalletExplorerHistoryMobileGroupHeader key={entry.key} label={entry.label} />;
        }

        return <WalletExplorerHistoryMobileRow key={entry.key} row={entry.row} />;
      })}
    </div>
  );
}
