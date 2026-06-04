import {
  buildTonTransferPnlItemId,
  emptyTonTransferPnlSummary,
  isDexFeeTonTransfer,
  isMeaningfulPureTransferAmount,
  nanotonToTonNumber,
  parseTransferAmountNanoton,
  type TonTransferPnlItem,
  type TonTransferPnlSummary,
} from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import { SWAP_AGGREGATE_ACTION_TYPES } from "@/modules/swap/domain/swap-inference.utils";
import { prisma } from "@/shared/infrastructure/api/prisma";
import {
  ChainActionDirection,
  ChainActionStatus,
  ChainActionType,
  type Prisma,
} from "@/shared/infrastructure/api/prisma-client";
import { getWalletAddressVariants, isSameWalletAddress } from "@/shared/lib/ton/ton-address";

type TonTransferRow = {
  direction: ChainActionDirection | null;
  amount: { toString(): string } | null;
  displayDetails: string | null;
  metadata: unknown;
  event: {
    tonEventId: string;
    timestamp: Date;
  };
  from: { name: string | null; rawAddress: string } | null;
  to: { name: string | null; rawAddress: string } | null;
};

const PURE_TON_TRANSFER_EVENT_FILTER = {
  AND: [
    {
      actions: {
        none: {
          type: { in: [...SWAP_AGGREGATE_ACTION_TYPES] },
        },
      },
    },
    {
      actions: {
        none: {
          type: { not: ChainActionType.TON_TRANSFER },
        },
      },
    },
    {
      actions: {
        some: {
          type: ChainActionType.TON_TRANSFER,
        },
      },
    },
  ],
} satisfies Prisma.ChainEventWhereInput;

const TON_TRANSFER_ROW_SELECT = {
  direction: true,
  amount: true,
  displayDetails: true,
  metadata: true,
  event: {
    select: {
      tonEventId: true,
      timestamp: true,
    },
  },
  from: {
    select: { name: true, rawAddress: true },
  },
  to: {
    select: { name: true, rawAddress: true },
  },
} as const;

function resolveCounterparty(row: TonTransferRow): string | null {
  if (row.direction === ChainActionDirection.OUTGOING) {
    return row.to?.name ?? row.to?.rawAddress ?? null;
  }

  if (row.direction === ChainActionDirection.INCOMING) {
    return row.from?.name ?? row.from?.rawAddress ?? null;
  }

  return null;
}

function isWalletParticipant(address: string | undefined, walletVariants: string[]): boolean {
  if (!address) {
    return false;
  }

  return walletVariants.some(variant => isSameWalletAddress(address, variant));
}

/**
 * Resolves transfer direction from the watched wallet perspective (not event owner).
 */
function resolveWalletRelativeDirection(
  row: TonTransferRow,
  walletVariants: string[]
): Extract<ChainActionDirection, "INCOMING" | "OUTGOING"> | null {
  const fromIsWallet = isWalletParticipant(row.from?.rawAddress, walletVariants);
  const toIsWallet = isWalletParticipant(row.to?.rawAddress, walletVariants);

  if (fromIsWallet && toIsWallet) {
    return null;
  }

  if (toIsWallet) {
    return ChainActionDirection.INCOMING;
  }

  if (fromIsWallet) {
    return ChainActionDirection.OUTGOING;
  }

  return null;
}

function dedupeAndNormalizeTonTransferRows(rows: TonTransferRow[], walletVariants: string[]): TonTransferRow[] {
  const seen = new Set<string>();
  const normalized: TonTransferRow[] = [];

  for (const row of rows) {
    const direction = resolveWalletRelativeDirection(row, walletVariants);
    if (!direction) {
      continue;
    }

    const amountNanoton = parseTransferAmountNanoton(row.amount);
    const dedupeKey = buildTonTransferPnlItemId(row.event.tonEventId, amountNanoton, direction);
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push({ ...row, direction });
  }

  return normalized;
}

function aggregateTonTransferRows(rows: TonTransferRow[]): TonTransferPnlSummary {
  let withdrawnNanoton = 0n;
  let depositedNanoton = 0n;
  let withdrawalCount = 0;
  let depositCount = 0;
  const items: TonTransferPnlItem[] = [];

  for (const row of rows) {
    if (isDexFeeTonTransfer(row.displayDetails, row.metadata)) {
      continue;
    }

    const amountNanoton = parseTransferAmountNanoton(row.amount);
    if (!isMeaningfulPureTransferAmount(amountNanoton)) {
      continue;
    }

    if (row.direction !== ChainActionDirection.INCOMING && row.direction !== ChainActionDirection.OUTGOING) {
      continue;
    }

    items.push({
      id: buildTonTransferPnlItemId(row.event.tonEventId, amountNanoton, row.direction),
      tonEventId: row.event.tonEventId,
      timestampIso: row.event.timestamp.toISOString(),
      direction: row.direction,
      amountNanoton,
      amountTon: nanotonToTonNumber(amountNanoton),
      counterparty: resolveCounterparty(row),
    });

    if (row.direction === ChainActionDirection.OUTGOING) {
      withdrawnNanoton += amountNanoton;
      withdrawalCount += 1;
      continue;
    }

    depositedNanoton += amountNanoton;
    depositCount += 1;
  }

  items.sort((a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime());

  return {
    withdrawnNanoton,
    depositedNanoton,
    withdrawnTon: nanotonToTonNumber(withdrawnNanoton),
    depositedTon: nanotonToTonNumber(depositedNanoton),
    withdrawalCount,
    depositCount,
    items,
  };
}

/**
 * Loads pure wallet TON transfers (single-action events, no swaps/contracts) for PnL.
 * Matches by walletAddress, from, and to — incoming from third-party events included.
 */
export async function loadWalletTonTransferPnl(walletAddress: string): Promise<TonTransferPnlSummary> {
  const walletVariants = getWalletAddressVariants(walletAddress);

  const rows = await prisma.chainAction.findMany({
    where: {
      type: ChainActionType.TON_TRANSFER,
      status: ChainActionStatus.SUCCESS,
      OR: [
        { walletAddress: { in: walletVariants } },
        { to: { rawAddress: { in: walletVariants } } },
        { from: { rawAddress: { in: walletVariants } } },
      ],
      event: PURE_TON_TRANSFER_EVENT_FILTER,
    },
    select: TON_TRANSFER_ROW_SELECT,
  });

  if (rows.length === 0) {
    return emptyTonTransferPnlSummary();
  }

  const normalizedRows = dedupeAndNormalizeTonTransferRows(rows, walletVariants);
  if (normalizedRows.length === 0) {
    return emptyTonTransferPnlSummary();
  }

  return aggregateTonTransferRows(normalizedRows);
}
