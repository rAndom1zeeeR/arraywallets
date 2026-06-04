"use server";

import { Address } from "@ton/core";
import { syncOneBatch, syncWalletEventsRun } from "@/entities/chain-events/chain-sync.service";
import type { SyncBatchResult, SyncRunResult } from "@/entities/chain-events/chain-sync.types";

/** Full sync on server (100 fetch + 100 insert per iteration). */
export const syncWalletEventsAction = async (friendlyAddress: string): Promise<SyncRunResult> => {
  const address = Address.parse(friendlyAddress.trim());
  return syncWalletEventsRun(address);
};

/** Single page only (≤100 events). */
export const syncWalletEventsBatchAction = async (
  friendlyAddress: string,
): Promise<SyncBatchResult> => {
  const address = Address.parse(friendlyAddress.trim());
  return syncOneBatch(address);
};
