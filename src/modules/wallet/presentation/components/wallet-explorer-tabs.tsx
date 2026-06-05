import Link from "next/link";
import { getWalletPagePath, walletHistoryFiltersToQueryOptions } from "@/shared/lib/wallet-route.utils";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";
import type { WalletTabId } from "@/shared/lib/wallet-route.utils";
import { WalletExplorerEventFilters } from "@/modules/wallet/presentation/components/wallet-explorer-event-filters";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface WalletExplorerTabsProps {
  address: string;
  activeTab: WalletTabId;
  currentPage: number;
  filters: WalletHistoryFilters;
  tokenCount?: number;
}

const TAB_ITEMS: Array<{ id: WalletTabId; label: string }> = [
  { id: "events", label: "History" },
  { id: "swaps", label: "Swaps" },
  { id: "pnl", label: "PnL" },
  { id: "tokens", label: "Tokens" },
];

export const WalletExplorerTabs = ({
  address,
  activeTab,
  currentPage,
  filters,
  tokenCount,
}: WalletExplorerTabsProps) => {
  return (
    <div>
      <div className={explorerStyles.tabList} role="tablist" aria-label="Wallet data views">
        {TAB_ITEMS.map(tab => {
          const isActive = tab.id === activeTab;
          const href = getWalletPagePath(address, {
            tab: tab.id,
            page:
              (tab.id === "events" || tab.id === "pnl") && currentPage > 1 ? currentPage : undefined,
            ...(tab.id === "events" ? walletHistoryFiltersToQueryOptions(filters) : {}),
          });

          return (
            <Link
              key={tab.id}
              href={href}
              role="tab"
              aria-selected={isActive}
              id={`wallet-tab-${tab.id}`}
              aria-controls={`wallet-tabpanel-${tab.id}`}
              className={cn(explorerStyles.tab, "shrink-0", isActive && explorerStyles.tabActive)}
            >
              {tab.label}
              {tab.id === "tokens" && tokenCount !== undefined && tokenCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">{tokenCount}</span>
              )}
            </Link>
          );
        })}
      </div>

      {activeTab === "events" && (
        <WalletExplorerEventFilters
          address={address}
          currentPage={currentPage}
          filters={filters}
        />
      )}
    </div>
  );
};
