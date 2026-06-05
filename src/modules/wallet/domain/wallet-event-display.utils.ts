import type { WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";

const EVENT_TIME_24H_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
};

const EVENT_DATETIME_FULL_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
};

function toEventDate(isoTimestamp: string | Date): Date {
  return isoTimestamp instanceof Date ? isoTimestamp : new Date(isoTimestamp);
}

/** Short wall-clock label for tables (24-hour, no seconds). */
export function formatEventTime24h(isoTimestamp: string | Date): string {
  return toEventDate(isoTimestamp).toLocaleTimeString(undefined, EVENT_TIME_24H_OPTIONS);
}

/** Full local date + time with seconds — for tooltips and detail views. */
export function formatEventDateTimeFull(isoTimestamp: string | Date): string {
  return toEventDate(isoTimestamp).toLocaleString(undefined, EVENT_DATETIME_FULL_OPTIONS);
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  TON_TRANSFER: "TON transfer",
  JETTON_TRANSFER: "Jetton transfer",
  FLAWED_JETTON_TRANSFER: "Jetton transfer",
  JETTON_SWAP: "Swap tokens",
  INFERRED_SWAP: "Swap tokens",
  JETTON_BURN: "Jetton burn",
  JETTON_MINT: "Jetton mint",
  DEPOSIT_STAKE: "Stake deposit",
  WITHDRAW_STAKE: "Stake withdraw",
  SMART_CONTRACT_EXEC: "Contract call",
};

/**
 * Human-readable action title for mobile feed (Tonviewer-style).
 */
export function getWalletActionTitle(action: WalletEventActionRow): string {
  if (action.type === "TON_TRANSFER") {
    if (action.direction === "INCOMING") return "Received TON";
    if (action.direction === "OUTGOING") return "Sent TON";
    return "TON transfer";
  }

  if (action.type === "JETTON_TRANSFER" || action.type === "FLAWED_JETTON_TRANSFER") {
    const symbol = action.jetton?.symbol ?? "Jetton";
    if (action.direction === "INCOMING") return `Received ${symbol}`;
    if (action.direction === "OUTGOING") return `Sent ${symbol}`;
    return `${symbol} transfer`;
  }

  return ACTION_TYPE_LABELS[action.type] ?? action.type.replace(/_/g, " ").toLowerCase();
}

/**
 * Relative or absolute date group label for transaction lists.
 */
export function getTransactionDateGroupLabel(isoTimestamp: string | Date, now: Date = new Date()): string {
  const date = isoTimestamp instanceof Date ? isoTimestamp : new Date(isoTimestamp);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const eventDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timePart = formatEventTime24h(date);

  if (eventDay.getTime() === startOfToday.getTime()) {
    return `Today at ${timePart}`;
  }

  if (eventDay.getTime() === startOfYesterday.getTime()) {
    return `Yesterday at ${timePart}`;
  }

  const datePart = date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });

  return `${datePart} ${timePart}`;
}

/**
 * Short date header for explorer history table (e.g. "05 May").
 */
export function getExplorerDateGroupLabel(isoTimestamp: string | Date): string {
  const date = isoTimestamp instanceof Date ? isoTimestamp : new Date(isoTimestamp);

  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}
