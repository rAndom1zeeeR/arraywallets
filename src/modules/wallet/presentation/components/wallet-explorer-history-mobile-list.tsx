"use client";

import { useMemo } from "react";
import { getExplorerDateGroupLabel } from "@/modules/wallet/domain/wallet-event-display.utils";
import {
  WalletExplorerHistoryMobileGroupHeader,
  WalletExplorerHistoryMobileIncompleteRow,
  WalletExplorerHistoryMobileRow,
} from "@/modules/wallet/presentation/components/wallet-explorer-history-mobile-row";
import type { WalletEventFlatRow } from "@/modules/wallet/presentation/pages/wallet-events-table.utils";
import type { EventWithActions } from "@/modules/wallet/domain/wallet-events.types";
import { mobileHistoryStyles } from "@/shared/presentation/components/explorer/mobile-history.styles";
import { cn } from "@/shared/lib/utils";

type MobileHistoryEntry =
  | { kind: "header"; label: string; key: string }
  | { kind: "item"; row: WalletEventFlatRow; key: string }
  | { kind: "incomplete"; event: EventWithActions; key: string };

function buildGroupedRows(events: EventWithActions[]): MobileHistoryEntry[] {
  const result: MobileHistoryEntry[] = [];
  let lastGroupLabel: string | null = null;

  for (const event of events) {
    const label = getExplorerDateGroupLabel(event.timestamp);
    if (label !== lastGroupLabel) {
      result.push({ kind: "header", label, key: `h-${event.id}-${label}` });
      lastGroupLabel = label;
    }

    if (event.actions.length === 0) {
      result.push({ kind: "incomplete", event, key: `incomplete-${event.id}` });
      continue;
    }

    event.actions.forEach((action, index) => {
      result.push({
        kind: "item",
        row: {
          rowKey: `${event.id}-${action.id}`,
          event,
          action,
          isFirstActionInEvent: index === 0,
          eventActionCount: event.actions.length,
        },
        key: `${event.id}-${action.id}`,
      });
    });
  }

  return result;
}

interface WalletExplorerHistoryMobileListProps {
  events: EventWithActions[];
  className?: string;
}

export const WalletExplorerHistoryMobileList = ({
  events,
  className,
}: WalletExplorerHistoryMobileListProps) => {
  const grouped = useMemo(() => buildGroupedRows(events), [events]);
  const hasRows = grouped.some(entry => entry.kind === "item" || entry.kind === "incomplete");

  if (events.length === 0 || !hasRows) {
    return (
      <div
        className={cn(
          "px-4 py-12 text-center text-sm text-muted-foreground",
          className
        )}
      >
        No matching events. Adjust filters or run sync to load history.
      </div>
    );
  }

  return (
    <div className={cn(mobileHistoryStyles.list, className)} role="list" aria-label="Wallet transaction history">
      {grouped.map(entry => {
        if (entry.kind === "header") {
          return <WalletExplorerHistoryMobileGroupHeader key={entry.key} label={entry.label} />;
        }

        if (entry.kind === "incomplete") {
          return <WalletExplorerHistoryMobileIncompleteRow key={entry.key} event={entry.event} />;
        }

        return <WalletExplorerHistoryMobileRow key={entry.key} row={entry.row} />;
      })}
    </div>
  );
};
