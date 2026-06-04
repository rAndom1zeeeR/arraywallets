import { serializeForJson } from "@/shared/infrastructure/sync/serialize-json";

interface RawEventPayload {
  actions?: unknown[];
}

export interface TransactionRawDetailsPayload {
  event: {
    tonEventId: string;
    timestamp: string;
    lt: string;
    isScam: boolean;
    inProgress: boolean;
    extra: string;
  };
  action: {
    id: string;
    orderIndex: number;
    type: string;
    status: string;
    direction: string | null;
    amount: string | null;
    amountIn: string | null;
    amountOut: string | null;
    tonIn: string | null;
    tonOut: string | null;
    displayAmount: string | null;
    displayDetails: string | null;
    metadata: unknown;
    from: { rawAddress: string; name: string | null } | null;
    to: { rawAddress: string; name: string | null } | null;
    jetton: { address: string; symbol: string; name: string } | null;
    jettonIn: { address: string; symbol: string; name: string } | null;
    jettonOut: { address: string; symbol: string; name: string } | null;
  };
  rawAction: unknown | null;
  rawEvent: unknown | null;
}

function toIsoTimestamp(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function toDecimalString(value: { toString(): string } | string | bigint | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "0";
  }

  return value.toString();
}

interface BuildRawDetailsParams {
  event: {
    tonEventId: string;
    timestamp: string | Date;
    lt: { toString(): string } | string | bigint;
    isScam: boolean;
    inProgress: boolean;
    extra: bigint | string | { toString(): string };
    rawData: unknown;
  };
  action: {
    id: string;
    orderIndex: number;
    type: string;
    status: string;
    direction: string | null;
    amount: { toString(): string } | null;
    amountIn: { toString(): string } | null;
    amountOut: { toString(): string } | null;
    tonIn: { toString(): string } | null;
    tonOut: { toString(): string } | null;
    displayAmount: string | null;
    displayDetails: string | null;
    metadata: unknown;
    from: { rawAddress: string; name: string | null } | null;
    to: { rawAddress: string; name: string | null } | null;
    jetton: { address: string; symbol: string; name: string } | null;
    jettonIn: { address: string; symbol: string; name: string } | null;
    jettonOut: { address: string; symbol: string; name: string } | null;
  };
}

function extractRawAction(rawData: unknown, orderIndex: number): unknown | null {
  if (!rawData || typeof rawData !== "object") {
    return null;
  }

  const actions = (rawData as RawEventPayload).actions;
  if (!Array.isArray(actions) || orderIndex < 0 || orderIndex >= actions.length) {
    return null;
  }

  return actions[orderIndex] ?? null;
}

/**
 * Builds a JSON-safe payload for displaying raw transaction details in the UI.
 */
export function buildTransactionRawDetailsPayload(params: BuildRawDetailsParams): TransactionRawDetailsPayload {
  const { event, action } = params;

  return serializeForJson({
    event: {
      tonEventId: event.tonEventId,
      timestamp: toIsoTimestamp(event.timestamp),
      lt: toDecimalString(event.lt),
      isScam: event.isScam,
      inProgress: event.inProgress,
      extra: toDecimalString(event.extra),
    },
    action: {
      id: action.id,
      orderIndex: action.orderIndex,
      type: action.type,
      status: action.status,
      direction: action.direction,
      amount: action.amount?.toString() ?? null,
      amountIn: action.amountIn?.toString() ?? null,
      amountOut: action.amountOut?.toString() ?? null,
      tonIn: action.tonIn?.toString() ?? null,
      tonOut: action.tonOut?.toString() ?? null,
      displayAmount: action.displayAmount,
      displayDetails: action.displayDetails,
      metadata: action.metadata,
      from: action.from ? { rawAddress: action.from.rawAddress, name: action.from.name } : null,
      to: action.to ? { rawAddress: action.to.rawAddress, name: action.to.name } : null,
      jetton: action.jetton
        ? {
            address: action.jetton.address,
            symbol: action.jetton.symbol,
            name: action.jetton.name,
          }
        : null,
      jettonIn: action.jettonIn
        ? {
            address: action.jettonIn.address,
            symbol: action.jettonIn.symbol,
            name: action.jettonIn.name,
          }
        : null,
      jettonOut: action.jettonOut
        ? {
            address: action.jettonOut.address,
            symbol: action.jettonOut.symbol,
            name: action.jettonOut.name,
          }
        : null,
    },
    rawAction: extractRawAction(event.rawData, action.orderIndex),
    rawEvent: event.rawData ?? null,
  });
}
