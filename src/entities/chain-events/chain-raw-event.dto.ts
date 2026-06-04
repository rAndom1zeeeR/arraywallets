import type { AccountEvent } from "@ton-api/client";
import { Address } from "@ton/core";
import type { Prisma } from "@generated/prisma/client";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const hasToRawString = (value: Record<string, unknown>): value is Record<string, unknown> & { toRawString: () => string } =>
  typeof value.toRawString === "function";

/**
 * Serializes TON API account events for Postgres `jsonb` (bigint → string, Address → raw).
 */
export const accountEventToJson = (event: AccountEvent): Prisma.InputJsonValue => {
  const serialized = JSON.stringify(event, (_key, value: unknown) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (value instanceof Address) {
      return value.toRawString();
    }
    if (isRecord(value) && hasToRawString(value)) {
      return value.toRawString();
    }
    return value;
  });

  return JSON.parse(serialized) as Prisma.InputJsonValue;
};

const BIGINT_JSON_KEYS = new Set([
  "lt",
  "extra",
  "amount",
  "tonIn",
  "tonOut",
  "amountIn",
  "amountOut",
  "tonAttached",
  "receivedAmount",
  "sentAmount",
]);

const reviveBigints = (value: unknown, key?: string): unknown => {
  if (value == null) {
    return value;
  }
  if (typeof value === "string" && key != null && BIGINT_JSON_KEYS.has(key) && /^-?\d+$/.test(value)) {
    return BigInt(value);
  }
  if (Array.isArray(value)) {
    return value.map(item => reviveBigints(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(record)) {
      out[entryKey] = reviveBigints(entryValue, entryKey);
    }
    return out;
  }
  return value;
};

/** Restores `AccountEvent` from DB jsonb (bigint fields were stored as strings). */
export const accountEventFromJson = (payload: Prisma.JsonValue): AccountEvent =>
  reviveBigints(payload) as AccountEvent;
