import type { AccountEvent } from "@ton-api/client";
import type { Prisma } from "@generated/prisma/client";
import { prisma } from "@/shared/api/prisma";
import { accountEventToJson } from "@/entities/chain-events/chain-raw-event.dto";
import type { WalletLtBounds } from "@/entities/chain-events/chain-sync.types";
import { decimalLtToBigint } from "@/shared/lib/decimal-lt";
import { toRawTonAddress } from "@/shared/lib/ton-address";

interface LtBoundsRow {
  max_lt: unknown;
  min_lt: unknown;
}

/** Min/max `lt` from stored raw payloads — cursors for `after_lt` / `before_lt`. */
export const getWalletLtBounds = async (walletAddress: string): Promise<WalletLtBounds> => {
  const rows = await prisma.$queryRaw<LtBoundsRow[]>`
    SELECT
      MAX((payload->>'lt')::numeric) AS max_lt,
      MIN((payload->>'lt')::numeric) AS min_lt
    FROM chain_raw_event
    WHERE wallet_address = ${walletAddress}
  `;

  const row = rows[0];
  return {
    maxLt: decimalLtToBigint(row?.max_lt ?? null),
    minLt: decimalLtToBigint(row?.min_lt ?? null),
  };
};

interface RawEventPageRow {
  ton_event_id: string;
  payload: Prisma.JsonValue;
}

interface RawEventCountRow {
  count: number | bigint;
}

export interface ChainRawEventsPage {
  items: { tonEventId: string; payload: Prisma.JsonValue }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const countChainRawEvents = async (walletAddress: string): Promise<number> => {
  const rows = await prisma.$queryRaw<RawEventCountRow[]>`
    SELECT COUNT(*)::int AS count
    FROM chain_raw_event
    WHERE wallet_address = ${walletAddress}
  `;
  const count = rows[0]?.count ?? 0;
  return typeof count === "bigint" ? Number(count) : count;
};

export const findChainRawEventsPage = async (
  walletAddress: string,
  page: number,
  pageSize: number,
): Promise<ChainRawEventsPage> => {
  const safePage = Math.max(1, page);
  const total = await countChainRawEvents(walletAddress);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total === 0) {
    return { items: [], total: 0, page: 1, pageSize, totalPages: 1 };
  }

  const currentPage = Math.min(safePage, totalPages);

  const rows = await prisma.$queryRaw<RawEventPageRow[]>`
    SELECT ton_event_id, payload
    FROM chain_raw_event
    WHERE wallet_address = ${walletAddress}
    ORDER BY (payload->>'lt')::numeric DESC
    LIMIT ${pageSize}
    OFFSET ${(currentPage - 1) * pageSize}
  `;

  return {
    items: rows.map(row => ({
      tonEventId: row.ton_event_id,
      payload: row.payload,
    })),
    total,
    page: currentPage,
    pageSize,
    totalPages,
  };
};

/**
 * Persists one TON API page (up to 100 events) into `chain_raw_event`.
 * Skips rows that already exist (`ton_event_id` unique).
 */
export const persistChainRawEventsBatch = async (events: AccountEvent[]): Promise<number> => {
  if (events.length === 0) {
    return 0;
  }

  const result = await prisma.$transaction(async tx => {
    return tx.chainRawEvent.createMany({
      data: events.map(event => ({
        tonEventId: event.eventId,
        walletAddress: toRawTonAddress(event.account.address),
        payload: accountEventToJson(event),
      })),
      skipDuplicates: true,
    });
  });

  return result.count;
};
