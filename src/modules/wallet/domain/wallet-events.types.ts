/**
 * Wallet event shapes for API / client UI.
 * Keep free of `@/shared/infrastructure/api/prisma-client` so client bundles stay Prisma-free.
 */

export interface WalletEventAddress {
  rawAddress: string;
  name: string | null;
}

export interface WalletEventJetton {
  address: string;
  symbol: string;
  name: string;
}

export interface WalletEventActionRow {
  id: string;
  orderIndex: number;
  type: string;
  status: string;
  direction: string | null;
  displayAmount: string | null;
  displayDetails: string | null;
  metadata: unknown;
  amount: string | { toString(): string } | null;
  amountIn: string | { toString(): string } | null;
  amountOut: string | { toString(): string } | null;
  tonIn: string | { toString(): string } | null;
  tonOut: string | { toString(): string } | null;
  from: WalletEventAddress | null;
  to: WalletEventAddress | null;
  jetton: WalletEventJetton | null;
  jettonIn: WalletEventJetton | null;
  jettonOut: WalletEventJetton | null;
}

export interface WalletEventWithActions {
  id: string;
  tonEventId: string;
  timestamp: string | Date;
  lt: string | bigint | { toString(): string };
  isScam: boolean;
  inProgress: boolean;
  extra: string | bigint | { toString(): string };
  rawData: unknown;
  actions: WalletEventActionRow[];
}

export type EventWithActions = WalletEventWithActions;
