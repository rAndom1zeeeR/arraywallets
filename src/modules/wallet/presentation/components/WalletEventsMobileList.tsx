"use client";

import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  CircleDot,
} from "lucide-react";
import { resolveDisplayDetails } from "@/modules/wallet/domain/display-details.utils";
import {
  getTransactionDateGroupLabel,
  getWalletActionTitle,
} from "@/modules/wallet/domain/wallet-event-display.utils";
import { buildTransactionRawDetailsPayload } from "@/modules/wallet/domain/raw-details.utils";
import type { WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";
import {
  formatEventActionAmount,
  formatTonLegIfNonZero,
} from "@/modules/jetton/domain/money-format.utils";
import { TonviewerAccountLink } from "@/modules/wallet/presentation/components/TonviewerAccountLink";
import { TonviewerTransactionLink } from "@/modules/wallet/presentation/components/TonviewerTransactionLink";
import { TransactionRawDetailsButton } from "@/modules/wallet/presentation/components/TransactionRawDetailsButton";
import type { WalletEventFlatRow } from "@/modules/wallet/presentation/pages/wallet-events-table.utils";
import type { ChainActionDirectionValue } from "@/shared/constants/chain-prisma.enums";
import {
  MobileList,
  MobileListAmount,
  MobileListBody,
  MobileListGroupHeader,
  MobileListIcon,
  MobileListItem,
} from "@/shared/presentation/components/mobile-list/mobile-list";
import { mobileListStyles } from "@/shared/presentation/components/mobile-list/mobile-list.styles";
import { truncateMiddle } from "@/shared/lib/truncate-middle.utils";
import { cn } from "@/shared/lib/utils";

interface WalletEventsMobileListProps {
  rows: WalletEventFlatRow[];
}

function getActionDetailsText(action: WalletEventActionRow): string | undefined {
  return resolveDisplayDetails(
    action.displayDetails,
    action.displayAmount,
    action.direction as ChainActionDirectionValue | null
  );
}

function ActionDirectionIcon({ action }: { action: WalletEventActionRow }) {
  const className = "size-4";

  if (action.type === "JETTON_SWAP" || action.type === "INFERRED_SWAP") {
    return <ArrowLeftRight className={className} aria-hidden />;
  }

  if (action.direction === "INCOMING") {
    return <ArrowDown className={cn(className, "text-profit")} aria-hidden />;
  }

  if (action.direction === "OUTGOING") {
    return <ArrowUp className={className} aria-hidden />;
  }

  if (action.direction === "SELF") {
    return <ArrowUpDown className={className} aria-hidden />;
  }

  return <CircleDot className={className} aria-hidden />;
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

function resolveAmountTone(
  direction: string | null | undefined
): "profit" | "loss" | "neutral" {
  if (direction === "INCOMING") return "profit";
  if (direction === "OUTGOING") return "loss";
  return "neutral";
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
    const label = getTransactionDateGroupLabel(row.event.timestamp);
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
    <MobileList aria-label="Wallet events">
      {grouped.map(entry => {
        if (entry.kind === "header") {
          return <MobileListGroupHeader key={entry.key}>{entry.label}</MobileListGroupHeader>;
        }

        const { event, action } = entry.row;
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

        return (
          <MobileListItem key={entry.key}>
            <MobileListIcon>
              <ActionDirectionIcon action={action} />
            </MobileListIcon>
            <MobileListBody>
              <div className={mobileListStyles.titleRow}>
                <div className="min-w-0">
                  <div className={mobileListStyles.title}>{title}</div>
                  {counterparty && (
                    <div className="mt-1">
                      <TonviewerAccountLink
                        address={counterparty}
                        label={truncateMiddle(counterparty, 8, 8)}
                        className="text-xs"
                      />
                    </div>
                  )}
                  {(action.type === "JETTON_SWAP" || action.type === "INFERRED_SWAP") &&
                    (tonInText || tonOutText) && (
                      <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {tonInText && <span className="text-loss">− {tonInText}</span>}
                        {tonInText && tonOutText && " → "}
                        {tonOutText && <span className="text-profit">+ {tonOutText}</span>}
                      </div>
                    )}
                </div>
                {amountText ? (
                  <MobileListAmount tone={resolveAmountTone(action.direction)}>
                    {amountPrefix}
                    {amountText}
                  </MobileListAmount>
                ) : (
                  <MobileListAmount tone="neutral">—</MobileListAmount>
                )}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <TonviewerTransactionLink
                  tonEventId={event.tonEventId}
                  rawData={event.rawData}
                  className="text-xs"
                />
                <TransactionRawDetailsButton
                  details={buildTransactionRawDetailsPayload({ event, action })}
                />
              </div>
              {detailsText && <p className={mobileListStyles.comment}>{detailsText}</p>}
            </MobileListBody>
          </MobileListItem>
        );
      })}
    </MobileList>
  );
}
