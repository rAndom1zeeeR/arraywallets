import type { WalletEventActionRow } from "@/modules/wallet/domain/wallet-events.types";

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

  const timePart = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

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
