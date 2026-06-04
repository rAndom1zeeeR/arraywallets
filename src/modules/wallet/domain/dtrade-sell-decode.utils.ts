import { beginCell, Cell } from "@ton/core";

/** DTrade bonding-curve sell opcode in router / wallet internal message. */
export const DTRADE_SELL_OP_HEX = "0xb7459e2c";

const DTRADE_SELL_OP = 0xb7459e2c;

interface CellLike {
  toBoc: () => Buffer | Uint8Array;
}

function isCellLike(value: unknown): value is CellLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "toBoc" in value &&
    typeof (value as CellLike).toBoc === "function"
  );
}

/**
 * TonAPI SDK may return message body as hex BOC string, Uint8Array, or @ton/core Cell.
 */
export function normalizeMessageBodyToBocHex(rawBody: unknown): string | null {
  if (!rawBody) {
    return null;
  }

  if (typeof rawBody === "string") {
    const trimmed = rawBody.trim();
    if (trimmed.startsWith("b5") || trimmed.startsWith("B5")) {
      return trimmed.toLowerCase();
    }

    return null;
  }

  if (rawBody instanceof Uint8Array) {
    return Buffer.from(rawBody).toString("hex");
  }

  if (isCellLike(rawBody)) {
    return Buffer.from(rawBody.toBoc()).toString("hex");
  }

  return null;
}

function parseFromPayloadHex(payloadHex: string): bigint | null {
  try {
    const cell = beginCell().storeBuffer(Buffer.from(payloadHex, "hex")).endCell();
    return parseAmountFromSlice(cell.beginParse());
  } catch {
    return null;
  }
}

function parseAmountFromSlice(slice: ReturnType<Cell["beginParse"]>): bigint | null {
  if (slice.remainingBits < 32) {
    return null;
  }

  const op = slice.loadUint(32);
  if (op !== DTRADE_SELL_OP) {
    return null;
  }

  if (slice.remainingBits >= 64) {
    slice.loadUintBig(64);
  }

  const amount = slice.loadCoins();
  return amount > 0n ? amount : null;
}

function normalizeOpCode(operation: string | undefined): number | null {
  if (!operation) {
    return null;
  }

  const trimmed = operation.trim().toLowerCase();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;

  if (!/^[0-9a-f]+$/i.test(hex)) {
    return null;
  }

  try {
    return Number.parseInt(hex, 16);
  } catch {
    return null;
  }
}

export function isDtradeSellOperation(operation: string | undefined): boolean {
  return normalizeOpCode(operation) === DTRADE_SELL_OP;
}

export function parseDtradeSellJettonAmountFromBoc(rawBodyHex: string): bigint | null {
  if (!rawBodyHex) {
    return null;
  }

  try {
    const cell = Cell.fromBoc(Buffer.from(rawBodyHex, "hex"))[0];
    return parseAmountFromSlice(cell.beginParse());
  } catch {
    return null;
  }
}

/** Parses sell amount from TonAPI message body in any supported representation. */
export function parseDtradeSellJettonAmountFromBody(rawBody: unknown): bigint | null {
  if (typeof rawBody === "string") {
    const cellDisplayMatch = rawBody.trim().match(/^x\{([0-9a-fA-F]+)_\}$/);
    if (cellDisplayMatch) {
      return parseFromPayloadHex(cellDisplayMatch[1]);
    }
  }

  if (isCellLike(rawBody)) {
    return parseDtradeSellJettonAmountFromBoc(Buffer.from(rawBody.toBoc()).toString("hex"));
  }

  const bocHex = normalizeMessageBodyToBocHex(rawBody);
  if (!bocHex) {
    return null;
  }

  return parseDtradeSellJettonAmountFromBoc(bocHex);
}
