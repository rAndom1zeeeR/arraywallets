import type { EventWithActions } from "@/modules/wallet/domain/wallet-events.types";
import { hasActionIndexGap } from "@/modules/wallet/domain/wallet-action-index.utils";
import {
  CHAIN_ACTION_DIRECTION_VALUES,
  CHAIN_ACTION_STATUS_VALUES,
  CHAIN_ACTION_TYPE_VALUES,
  ChainActionDirection,
  ChainActionStatus,
  type ChainActionDirectionValue,
  type ChainActionStatusValue,
  type ChainActionTypeValue,
} from "@/shared/constants/chain-prisma.enums";

export const WALLET_HISTORY_FILTER_ALL = "all" as const;

export type WalletEventTypeFilter = typeof WALLET_HISTORY_FILTER_ALL | ChainActionTypeValue;

export type WalletHistoryStatusFilter =
  | typeof WALLET_HISTORY_FILTER_ALL
  | ChainActionStatusValue
  | "incomplete";

export type WalletEventDirectionFilter =
  | typeof WALLET_HISTORY_FILTER_ALL
  | ChainActionDirectionValue;

/** @deprecated Use {@link WALLET_HISTORY_FILTER_ALL} */
export const WALLET_EVENT_TYPE_FILTER_ALL = WALLET_HISTORY_FILTER_ALL;

export const WALLET_EVENT_TYPE_FILTER_OPTIONS: WalletEventTypeFilter[] = [
  WALLET_HISTORY_FILTER_ALL,
  ...CHAIN_ACTION_TYPE_VALUES,
];

export const WALLET_HISTORY_STATUS_FILTER_OPTIONS: WalletHistoryStatusFilter[] = [
  WALLET_HISTORY_FILTER_ALL,
  ...CHAIN_ACTION_STATUS_VALUES,
  "incomplete",
];

export const WALLET_HISTORY_DIRECTION_FILTER_OPTIONS: WalletEventDirectionFilter[] = [
  WALLET_HISTORY_FILTER_ALL,
  ...CHAIN_ACTION_DIRECTION_VALUES,
];

/** @deprecated Use {@link WALLET_HISTORY_STATUS_FILTER_OPTIONS} */
export const WALLET_EVENT_STATUS_FILTERS = WALLET_HISTORY_STATUS_FILTER_OPTIONS;

/** @deprecated Use {@link WalletHistoryStatusFilter} */
export type WalletEventStatusFilter = WalletHistoryStatusFilter;

const ACTION_TYPE_LABELS: Record<ChainActionTypeValue, string> = {
  TON_TRANSFER: "TON transfer",
  JETTON_TRANSFER: "Jetton transfer",
  FLAWED_JETTON_TRANSFER: "Flawed jetton transfer",
  JETTON_SWAP: "Jetton swap",
  INFERRED_SWAP: "Inferred swap",
  JETTON_BURN: "Jetton burn",
  JETTON_MINT: "Jetton mint",
  SMART_CONTRACT_EXEC: "Smart contract",
  DEPOSIT_STAKE: "Deposit stake",
  WITHDRAW_STAKE: "Withdraw stake",
  NFT_TRANSFER: "NFT transfer",
  NFT_MINT: "NFT mint",
  NFT_SALE: "NFT sale",
  SUBSCRIBE: "Subscribe",
  UNSUBSCRIBE: "Unsubscribe",
  AUCTION_BID: "Auction bid",
  DOMAIN_RENEW: "Domain renew",
  UNKNOWN: "Unknown",
};

const ACTION_STATUS_LABELS: Record<ChainActionStatusValue, string> = {
  SUCCESS: "Success",
  FAILED: "Failed",
  PENDING: "Pending",
};

const ACTION_DIRECTION_LABELS: Record<ChainActionDirectionValue, string> = {
  INCOMING: "Incoming",
  OUTGOING: "Outgoing",
  SELF: "Self",
  UNKNOWN: "Unknown",
};

const LEGACY_STATUS_BY_FILTER: Record<string, ChainActionStatusValue> = {
  success: ChainActionStatus.SUCCESS,
  failed: ChainActionStatus.FAILED,
  pending: ChainActionStatus.PENDING,
};

export interface WalletHistoryFilters {
  actionType: WalletEventTypeFilter;
  actionStatus: WalletHistoryStatusFilter;
  direction: WalletEventDirectionFilter;
  /** Inclusive UTC calendar day, `YYYY-MM-DD`. */
  dateFrom: string | null;
  dateTo: string | null;
}

export const EMPTY_WALLET_HISTORY_FILTERS: WalletHistoryFilters = {
  actionType: WALLET_HISTORY_FILTER_ALL,
  actionStatus: WALLET_HISTORY_FILTER_ALL,
  direction: WALLET_HISTORY_FILTER_ALL,
  dateFrom: null,
  dateTo: null,
};

export function getWalletActionTypeFilterLabel(filter: WalletEventTypeFilter): string {
  if (filter === WALLET_HISTORY_FILTER_ALL) {
    return "All types";
  }

  return ACTION_TYPE_LABELS[filter];
}

export function getWalletHistoryStatusFilterLabel(filter: WalletHistoryStatusFilter): string {
  if (filter === WALLET_HISTORY_FILTER_ALL) {
    return "All statuses";
  }

  if (filter === "incomplete") {
    return "Incomplete";
  }

  return ACTION_STATUS_LABELS[filter];
}

export function getWalletDirectionFilterLabel(filter: WalletEventDirectionFilter): string {
  if (filter === WALLET_HISTORY_FILTER_ALL) {
    return "All directions";
  }

  return ACTION_DIRECTION_LABELS[filter];
}

export function isChainActionTypeValue(value: string): value is ChainActionTypeValue {
  return CHAIN_ACTION_TYPE_VALUES.includes(value as ChainActionTypeValue);
}

export function isChainActionStatusValue(value: string): value is ChainActionStatusValue {
  return CHAIN_ACTION_STATUS_VALUES.includes(value as ChainActionStatusValue);
}

export function isChainActionDirectionValue(value: string): value is ChainActionDirectionValue {
  return CHAIN_ACTION_DIRECTION_VALUES.includes(value as ChainActionDirectionValue);
}

export function parseWalletHistoryStatusFilter(value: string | undefined): WalletHistoryStatusFilter {
  if (!value || value === WALLET_HISTORY_FILTER_ALL) {
    return WALLET_HISTORY_FILTER_ALL;
  }

  if (value === "incomplete") {
    return "incomplete";
  }

  const legacy = LEGACY_STATUS_BY_FILTER[value.toLowerCase()];
  if (legacy) {
    return legacy;
  }

  if (isChainActionStatusValue(value)) {
    return value;
  }

  return WALLET_HISTORY_FILTER_ALL;
}

export function parseWalletHistoryDirectionFilter(
  value: string | undefined
): WalletEventDirectionFilter {
  if (!value || value === WALLET_HISTORY_FILTER_ALL) {
    return WALLET_HISTORY_FILTER_ALL;
  }

  if (isChainActionDirectionValue(value)) {
    return value;
  }

  return WALLET_HISTORY_FILTER_ALL;
}

/**
 * Event is incomplete when it has no actions or gaps in action order indices.
 */
export function isIncompleteWalletEvent(event: EventWithActions): boolean {
  if (event.actions.length === 0) {
    return true;
  }

  const maxOrderIndex = Math.max(...event.actions.map(action => action.orderIndex));
  return hasActionIndexGap(event.actions.length, maxOrderIndex);
}

export function hasActiveHistoryFilters(filters: WalletHistoryFilters): boolean {
  return (
    filters.actionType !== WALLET_HISTORY_FILTER_ALL ||
    filters.actionStatus !== WALLET_HISTORY_FILTER_ALL ||
    filters.direction !== WALLET_HISTORY_FILTER_ALL ||
    filters.dateFrom !== null ||
    filters.dateTo !== null
  );
}
