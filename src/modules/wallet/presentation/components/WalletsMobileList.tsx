import Link from "next/link";
import type { AnalyzedWalletListItem } from "@/modules/wallet/domain/wallets-list.types";
import { WalletSyncStatusBadge } from "@/modules/wallet/presentation/components/WalletSyncStatusBadge";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { truncateMiddle } from "@/shared/lib/truncate-middle.utils";
import {
  MobileList,
  MobileListAmount,
  MobileListBody,
  MobileListIcon,
  MobileListItem,
} from "@/shared/presentation/components/mobile-list/mobile-list";
import { mobileListStyles } from "@/shared/presentation/components/mobile-list/mobile-list.styles";
import { Wallet } from "lucide-react";

interface WalletsMobileListProps {
  wallets: AnalyzedWalletListItem[];
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  if (date.getTime() === 0) {
    return "—";
  }

  return date.toLocaleString();
}

export function WalletsMobileList({ wallets }: WalletsMobileListProps) {
  return (
    <MobileList aria-label="Analyzed wallets">
      {wallets.map(wallet => (
        <MobileListItem key={wallet.rawAddress}>
          <MobileListIcon>
            <Wallet className="size-4" aria-hidden />
          </MobileListIcon>
          <MobileListBody>
            <div className={mobileListStyles.titleRow}>
              <div className="min-w-0">
                <Link
                  href={getWalletPagePath(wallet.address)}
                  className={mobileListStyles.title}
                  title={wallet.address}
                >
                  {truncateMiddle(wallet.address, 10, 8)}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <WalletSyncStatusBadge status={wallet.status} />
                  <span className="text-xs text-muted-foreground">
                    {wallet.eventsCount} ev · {wallet.actionsCount} act
                  </span>
                </div>
                {wallet.error && (
                  <p className="mt-1 text-xs text-loss" title={wallet.error}>
                    {wallet.error}
                  </p>
                )}
                <time className="mt-1 block text-xs text-muted-foreground">
                  {formatDateTime(wallet.lastUpdated)}
                </time>
              </div>
              <MobileListAmount tone="neutral">
                <Link
                  href={getWalletPagePath(wallet.address)}
                  className="text-xs font-medium text-primary"
                >
                  Open →
                </Link>
              </MobileListAmount>
            </div>
          </MobileListBody>
        </MobileListItem>
      ))}
    </MobileList>
  );
}
