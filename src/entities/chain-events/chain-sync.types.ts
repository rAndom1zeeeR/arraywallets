export type ChainSyncDirection = "new" | "old" | "initial";

export interface SyncBatchResult {
  success: boolean;
  direction: ChainSyncDirection | null;
  fetched: number;
  saved: number;
  hasMore: boolean;
  error?: string;
}

export interface SyncRunResult {
  success: boolean;
  batches: number;
  totalFetched: number;
  totalSaved: number;
  lastDirection: ChainSyncDirection | null;
  hasMore: boolean;
  error?: string;
}

export interface WalletLtBounds {
  maxLt: bigint | null;
  minLt: bigint | null;
}
