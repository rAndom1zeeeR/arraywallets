import { ChainSyncStatus, Prisma } from "@generated/prisma/client";
import { prisma } from "@/shared/api/prisma";
import type { ChainSyncCursors } from "@/entities/chain-events/chain-sync-cursors.types";
import { decimalLtToBigint } from "@/shared/lib/decimal-lt";

export const ensureChainSyncState = async (walletAddress: string): Promise<void> => {
  await prisma.chainSyncState.upsert({
    where: { walletAddress },
    create: { walletAddress, status: ChainSyncStatus.IDLE },
    update: {},
  });
};

export const getChainSyncCursors = async (walletAddress: string): Promise<ChainSyncCursors> => {
  const state = await prisma.chainSyncState.findUniqueOrThrow({
    where: { walletAddress },
    select: {
      lastLt: true,
      oldestFetchedLt: true,
      forwardScanDone: true,
    },
  });

  return {
    afterLt: decimalLtToBigint(state.lastLt),
    beforeLt: decimalLtToBigint(state.oldestFetchedLt),
    forwardScanDone: state.forwardScanDone,
  };
};

export const markChainSyncStarted = async (walletAddress: string): Promise<void> => {
  const state = await prisma.chainSyncState.findUnique({
    where: { walletAddress },
    select: { status: true },
  });
  const isNewRun = state?.status !== ChainSyncStatus.SYNCING;

  await prisma.chainSyncState.update({
    where: { walletAddress },
    data: {
      status: ChainSyncStatus.SYNCING,
      error: null,
      completedAt: null,
      ...(isNewRun ? { startedAt: new Date(), forwardScanDone: false } : {}),
    },
  });
};

export const updateForwardCursor = async (
  walletAddress: string,
  saved: number,
  cursorLt: bigint,
  lastTimestamp: Date | null,
): Promise<void> => {
  await prisma.chainSyncState.update({
    where: { walletAddress },
    data: {
      status: ChainSyncStatus.SYNCING,
      eventsSynced: { increment: saved },
      lastLt: new Prisma.Decimal(cursorLt.toString()),
      lastTimestamp: lastTimestamp ?? undefined,
    },
  });
};

export const updateBackwardCursor = async (
  walletAddress: string,
  saved: number,
  cursorLt: bigint,
): Promise<void> => {
  await prisma.chainSyncState.update({
    where: { walletAddress },
    data: {
      status: ChainSyncStatus.SYNCING,
      eventsSynced: { increment: saved },
      oldestFetchedLt: new Prisma.Decimal(cursorLt.toString()),
    },
  });
};

export const markForwardScanDone = async (walletAddress: string): Promise<void> => {
  await prisma.chainSyncState.update({
    where: { walletAddress },
    data: { forwardScanDone: true },
  });
};

export const markChainSyncCompleted = async (walletAddress: string): Promise<void> => {
  await prisma.chainSyncState.update({
    where: { walletAddress },
    data: {
      status: ChainSyncStatus.COMPLETED,
      completedAt: new Date(),
      error: null,
      forwardScanDone: true,
    },
  });
};

export const markChainSyncError = async (walletAddress: string, message: string): Promise<void> => {
  await prisma.chainSyncState.update({
    where: { walletAddress },
    data: {
      status: ChainSyncStatus.ERROR,
      error: message,
    },
  });
};
