import type { ChainSyncStatusValue } from "@/shared/constants/chain-prisma.enums";

export interface AnalyzedWalletListItem {
  address: string;
  rawAddress: string;
  status: ChainSyncStatusValue;
  eventsSynced: number;
  actionsSynced: number;
  eventsCount: number;
  actionsCount: number;
  lastUpdated: string;
  completedAt: string | null;
  error: string | null;
}
