"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, CircleDot, RefreshCw } from "lucide-react";
import { resolveDisplayDetails } from "@/modules/wallet/domain/display-details.utils";
import {
  getExplorerDateGroupLabel,
  getWalletActionTitle,
} from "@/modules/wallet/domain/wallet-event-display.utils";
import { EventTimeLabel } from "@/modules/wallet/presentation/components/EventTimeLabel";
import type { WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";
import {
  formatEventActionAmount,
  formatTonLegIfNonZero,
} from "@/modules/jetton/domain/money-format.utils";
import { TonviewerAccountLink } from "@/modules/wallet/presentation/components/TonviewerAccountLink";
import { ActionTypeBadge } from "@/shared/presentation/components/explorer/action-type-badge";
import { CopyToClipboardButton } from "@/shared/presentation/components/explorer/copy-to-clipboard-button";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import type { WalletEventFlatRow } from "@/modules/wallet/presentation/pages/wallet-events-table.utils";
import type { EventWithActions } from "@/modules/wallet/domain/wallet-events.types";
import type { ChainActionDirectionValue } from "@/shared/constants/chain-prisma.enums";
import { truncateMiddle } from "@/shared/lib/truncate-middle.utils";
import { cn } from "@/shared/lib/utils";

interface WalletExplorerHistoryTableProps {
  events: EventWithActions[];
}

function ActionDirectionIcon({ action }: { action: WalletEventActionRow }) {
  const className = "size-3.5";

  if (action.type === "JETTON_SWAP" || action.type === "INFERRED_SWAP") {
    return <RefreshCw className={cn(className, "text-muted-foreground")} aria-hidden />;
  }

  if (action.direction === "INCOMING") {
    return <ArrowDown className={cn(className, "text-profit")} aria-hidden />;
  }

  if (action.direction === "OUTGOING") {
    return <ArrowUp className={cn(className, "text-loss")} aria-hidden />;
  }

  return <CircleDot className={cn(className, "text-muted-foreground")} aria-hidden />;
}

function resolveCounterpartyAddress(action: WalletEventActionRow): string | null {
  if (action.direction === "INCOMING" && action.from?.rawAddress) {
    return action.from.rawAddress;
  }

  if (action.direction === "OUTGOING" && action.to?.rawAddress) {
    return action.to.rawAddress;
  }

  return action.to?.rawAddress ?? action.from?.rawAddress ?? null;
}

function getActionDetailsText(action: WalletEventActionRow): string | undefined {
  return resolveDisplayDetails(
    action.displayDetails,
    action.displayAmount,
    action.direction as ChainActionDirectionValue | null
  );
}

type ExplorerHistoryEntry =
  | { kind: "header"; label: string; key: string }
  | { kind: "item"; row: WalletEventFlatRow; key: string }
  | { kind: "incomplete"; event: EventWithActions; key: string };

function buildGroupedRows(events: EventWithActions[]): ExplorerHistoryEntry[] {
  const result: ExplorerHistoryEntry[] = [];
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

function IncompleteEventRow({ event }: { event: EventWithActions }) {
  return (
    <div className={explorerStyles.tableRow} role="row">
      <div className="col-span-1" role="cell">
        <div className={explorerStyles.directionIcon}>
          <CircleDot className="size-3.5 text-chart-5" aria-hidden />
        </div>
      </div>
      <div className="col-span-3 flex flex-col gap-1 pr-3" role="cell">
        <span className="text-sm font-semibold text-foreground">Incomplete event</span>
        <span className="w-fit rounded bg-chart-5/15 px-1.5 py-0.5 text-xs font-medium text-chart-5">
          NEEDS REPAIR
        </span>
      </div>
      <div className="col-span-3 text-sm text-muted-foreground" role="cell">
        No actions stored
      </div>
      <div className="col-span-3 text-sm text-muted-foreground" role="cell">
        Run sync + repair
      </div>
      <div className="col-span-2 text-right" role="cell">
        <EventTimeLabel timestamp={event.timestamp} className="text-xs text-muted-foreground" />
      </div>
    </div>
  );
}

function HistoryRow({ row }: { row: WalletEventFlatRow }) {
  const { event, action } = row;
  const title = getWalletActionTitle(action);
  const amountText = formatEventActionAmount({
    type: action.type,
    displayAmount: action.displayAmount,
    amount: action.amount,
    jetton: action.jetton,
  });
  const tonInText = formatTonLegIfNonZero(action.tonIn);
  const tonOutText = formatTonLegIfNonZero(action.tonOut);
  const counterparty = resolveCounterpartyAddress(action);
  const detailsText = getActionDetailsText(action);
  const amountPrefix =
    action.direction === "INCOMING" ? "+" : action.direction === "OUTGOING" ? "−" : "";
  const displayAmount =
    (action.type === "JETTON_SWAP" || action.type === "INFERRED_SWAP") && tonInText && tonOutText
      ? `${amountPrefix}${amountText ?? ""} → +${tonOutText}`
      : amountText
        ? `${amountPrefix}${amountText}`
        : null;

  return (
    <div className={explorerStyles.tableRow} role="row">
      <div className="col-span-1" role="cell">
        <div className={explorerStyles.directionIcon}>
          <ActionDirectionIcon action={action} />
        </div>
      </div>
      <div className="col-span-3 flex flex-col gap-1 pr-3" role="cell">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <ActionTypeBadge type={action.type} />
        {detailsText && (
          <span className="w-fit rounded bg-explorer-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
            {detailsText}
          </span>
        )}
      </div>
      <div className="col-span-3 flex min-w-0 items-center gap-1 pr-3" role="cell">
        {counterparty ? (
          <>
            <TonviewerAccountLink
              address={counterparty}
              label={truncateMiddle(counterparty, 8, 8)}
              className="truncate text-sm text-primary"
            />
            <CopyToClipboardButton value={counterparty} iconClassName="size-2.5" />
          </>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
      <div className="col-span-3" role="cell">
        {displayAmount ? (
          <span
            className={cn(
              "text-sm font-semibold tabular-nums",
              action.direction === "INCOMING" && "text-profit",
              action.direction === "OUTGOING" && "text-loss",
              action.type === "JETTON_SWAP" || action.type === "INFERRED_SWAP"
                ? "text-foreground"
                : undefined
            )}
          >
            {displayAmount}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
      <div className="col-span-2 text-right" role="cell">
        <EventTimeLabel timestamp={event.timestamp} className="text-xs text-muted-foreground" />
      </div>
    </div>
  );
}

export const WalletExplorerHistoryTable = ({ events }: WalletExplorerHistoryTableProps) => {
  const grouped = useMemo(() => buildGroupedRows(events), [events]);
  const hasRows = grouped.some(entry => entry.kind === "item" || entry.kind === "incomplete");

  if (events.length === 0 || !hasRows) {
    return (
      <div className={cn(explorerStyles.tableShell, "px-4 py-12 text-center text-sm text-muted-foreground")}>
        No matching events. Adjust filters or run sync to load history.
      </div>
    );
  }

  return (
    <div className={explorerStyles.tableShell}>
      <div className={explorerStyles.tableScroll}>
        <div className={explorerStyles.tableMinWidth}>
          <div className={explorerStyles.tableHeader} role="row">
            <div className="col-span-1" role="columnheader">
              Dir
            </div>
            <div className="col-span-3" role="columnheader">
              Action
            </div>
            <div className="col-span-3" role="columnheader">
              Address
            </div>
            <div className="col-span-3" role="columnheader">
              Amount
            </div>
            <div className="col-span-2 text-right" role="columnheader">
              Time
            </div>
          </div>
          <div role="table" aria-label="Wallet transaction history">
            {grouped.map(entry => {
              if (entry.kind === "header") {
                return (
                  <div key={entry.key} className={explorerStyles.tableGroup} role="row">
                    {entry.label}
                  </div>
                );
              }

              if (entry.kind === "incomplete") {
                return <IncompleteEventRow key={entry.key} event={entry.event} />;
              }

              return <HistoryRow key={entry.key} row={entry.row} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
