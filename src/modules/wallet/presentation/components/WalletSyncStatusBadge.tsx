import { ChainSyncStatus, type ChainSyncStatusValue } from "@/shared/constants/chain-prisma.enums";
import { pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

const STATUS_LABELS: Record<ChainSyncStatusValue, string> = {
  [ChainSyncStatus.IDLE]: "Idle",
  [ChainSyncStatus.SYNCING]: "Syncing",
  [ChainSyncStatus.PAUSED]: "Paused",
  [ChainSyncStatus.ERROR]: "Error",
  [ChainSyncStatus.COMPLETED]: "Completed",
};

const STATUS_CLASSES: Record<ChainSyncStatusValue, string> = {
  [ChainSyncStatus.IDLE]: "border-border bg-secondary text-muted-foreground",
  [ChainSyncStatus.SYNCING]: "border-primary/30 bg-primary/10 text-primary",
  [ChainSyncStatus.PAUSED]: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  [ChainSyncStatus.ERROR]: "border-loss/30 bg-loss/10 text-loss",
  [ChainSyncStatus.COMPLETED]: "border-profit/30 bg-profit/10 text-profit",
};

interface WalletSyncStatusBadgeProps {
  status: ChainSyncStatusValue;
}

export function WalletSyncStatusBadge({ status }: WalletSyncStatusBadgeProps) {
  return (
    <span className={cn(pageStyles.badge, "border", STATUS_CLASSES[status])}>{STATUS_LABELS[status]}</span>
  );
}
