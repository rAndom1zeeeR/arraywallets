"use client";

import { ArrowDown, ArrowUp, CircleDot, RefreshCw } from "lucide-react";
import { resolveDisplayDetails } from "@/modules/wallet/domain/display-details.utils";
import { getWalletActionTitle } from "@/modules/wallet/domain/wallet-event-display.utils";
import { EventTimeLabel } from "@/modules/wallet/presentation/components/EventTimeLabel";
import type { WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";
import {
  formatEventActionAmount,
  formatTonLegIfNonZero,
} from "@/modules/jetton/domain/money-format.utils";
import { TonviewerAccountLink } from "@/modules/wallet/presentation/components/TonviewerAccountLink";
import { ActionTypeBadge } from "@/shared/presentation/components/explorer/action-type-badge";
import { CopyToClipboardButton } from "@/shared/presentation/components/explorer/copy-to-clipboard-button";
import { mobileHistoryStyles } from "@/shared/presentation/components/explorer/mobile-history.styles";
import type { WalletEventFlatRow } from "@/modules/wallet/presentation/pages/wallet-events-table.utils";
import type { EventWithActions } from "@/modules/wallet/domain/wallet-events.types";
import type { ChainActionDirectionValue } from "@/shared/constants/chain-prisma.enums";
import { truncateMiddle } from "@/shared/lib/truncate-middle.utils";
import { cn } from "@/shared/lib/utils";

function ActionDirectionIcon({ action }: { action: WalletEventActionRow }) {
  const className = "size-4";

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

function resolveAmountTone(
  action: WalletEventActionRow
): keyof Pick<typeof mobileHistoryStyles, "amountProfit" | "amountLoss" | "amountNeutral"> {
  if (action.type === "JETTON_SWAP" || action.type === "INFERRED_SWAP") {
    return "amountNeutral";
  }

  if (action.direction === "INCOMING") return "amountProfit";
  if (action.direction === "OUTGOING") return "amountLoss";
  return "amountNeutral";
}

function buildDisplayAmount(
  action: WalletEventActionRow,
  amountText: string | null,
  tonInText: string | null,
  tonOutText: string | null,
  amountPrefix: string
): string | null {
  if (
    (action.type === "JETTON_SWAP" || action.type === "INFERRED_SWAP") &&
    tonInText &&
    tonOutText
  ) {
    return `${amountPrefix}${amountText ?? ""} → +${tonOutText}`;
  }

  if (!amountText) {
    return null;
  }

  return `${amountPrefix}${amountText}`;
}

interface WalletExplorerHistoryMobileRowProps {
  row: WalletEventFlatRow;
}

export const WalletExplorerHistoryMobileRow = ({ row }: WalletExplorerHistoryMobileRowProps) => {
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

  const displayAmount = buildDisplayAmount(action, amountText, tonInText, tonOutText, amountPrefix);
  const amountTone = resolveAmountTone(action);
  const isCompactAmount = displayAmount !== null && displayAmount.length > 22;

  return (
    <div className={mobileHistoryStyles.row}>
      <div className={mobileHistoryStyles.iconWrap} aria-hidden>
        <ActionDirectionIcon action={action} />
      </div>

      <div className={mobileHistoryStyles.body}>
        <div className={mobileHistoryStyles.content}>
          <p className={mobileHistoryStyles.title}>{title}</p>

          <div className={mobileHistoryStyles.badgeRow}>
            <ActionTypeBadge type={action.type} className="uppercase" />
          </div>

          <div className={mobileHistoryStyles.addressRow}>
            {counterparty ? (
              <>
                <TonviewerAccountLink
                  address={counterparty}
                  label={truncateMiddle(counterparty, 8, 8)}
                  className={mobileHistoryStyles.addressLink}
                />
                <CopyToClipboardButton
                  value={counterparty}
                  iconClassName="size-2.5"
                  className="shrink-0"
                />
              </>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>

          {detailsText && (
            <span className={mobileHistoryStyles.detailsChip}>{detailsText}</span>
          )}
        </div>

        <div className={mobileHistoryStyles.amountCol}>
          {displayAmount ? (
            <span
              className={cn(
                isCompactAmount ? mobileHistoryStyles.amountCompact : mobileHistoryStyles.amount,
                mobileHistoryStyles[amountTone]
              )}
            >
              {displayAmount}
            </span>
          ) : (
            <span className={cn(mobileHistoryStyles.amount, "text-muted-foreground")}>—</span>
          )}
          <EventTimeLabel timestamp={event.timestamp} className={mobileHistoryStyles.time} />
        </div>
      </div>
    </div>
  );
};

export const WalletExplorerHistoryMobileIncompleteRow = ({
  event,
}: {
  event: EventWithActions;
}) => (
  <div className={mobileHistoryStyles.row}>
    <div className={mobileHistoryStyles.iconWrap} aria-hidden>
      <CircleDot className="size-4 text-chart-5" />
    </div>
    <div className={mobileHistoryStyles.body}>
      <div className={mobileHistoryStyles.content}>
        <p className={mobileHistoryStyles.title}>Incomplete event</p>
        <div className={mobileHistoryStyles.badgeRow}>
          <span className="rounded bg-chart-5/15 px-1.5 py-0.5 text-xs font-medium text-chart-5">
            NEEDS REPAIR
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Run sync + repair</p>
      </div>
      <div className={mobileHistoryStyles.amountCol}>
        <EventTimeLabel timestamp={event.timestamp} className={mobileHistoryStyles.time} />
      </div>
    </div>
  </div>
);

export const WalletExplorerHistoryMobileGroupHeader = ({ label }: { label: string }) => (
  <div className={mobileHistoryStyles.groupHeader}>{label}</div>
);
