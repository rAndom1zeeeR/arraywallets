import { Address } from "@ton/core";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * JSON replacer: bigint → string, Address → friendly string, Buffer → hex.
 */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Address) {
    return value.toString();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("hex");
  }

  if (value !== null && typeof value === "object" && !isPlainObject(value) && !(value instanceof Date)) {
    if ("workChain" in value && "hash" in value && typeof (value as Address).toString === "function") {
      try {
        return (value as Address).toString();
      } catch {
        return String(value);
      }
    }
  }

  return value;
}

/**
 * Deep-clone value into JSON-safe plain objects (for Prisma Json fields).
 */
export function serializeForJson<T>(payload: T): T {
  return JSON.parse(JSON.stringify(payload, jsonReplacer)) as T;
}
