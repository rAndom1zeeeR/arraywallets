import Link from "next/link";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";
import { getWalletPagePath, walletHistoryFiltersToQueryOptions, type WalletTabId } from "@/shared/lib/wallet-route.utils";
import { tabStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

interface WalletTabConfig {
  id: WalletTabId;
  label: string;
}

const WALLET_TABS: WalletTabConfig[] = [
  { id: "events", label: "Events" },
  { id: "swaps", label: "Swaps" },
  { id: "pnl", label: "PnL" },
  { id: "tokens", label: "Jettons" },
];

export interface WalletPageTabsProps {
  address: string;
  activeTab: WalletTabId;
  currentPage: number;
  filters: WalletHistoryFilters;
}

export function WalletPageTabs({
  address,
  activeTab,
  currentPage,
  filters,
}: WalletPageTabsProps) {
  return (
    <nav className={cn("mb-6", tabStyles.nav)} aria-label="Wallet sections">
      <div className={tabStyles.list} role="tablist">
        {WALLET_TABS.map(tab => {
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              href={getWalletPagePath(address, {
                tab: tab.id,
                page:
                  (tab.id === "events" || tab.id === "pnl") && currentPage > 1 ? currentPage : undefined,
                ...(tab.id === "events" ? walletHistoryFiltersToQueryOptions(filters) : {}),
              })}
              role="tab"
              aria-selected={isActive}
              aria-controls={`wallet-tabpanel-${tab.id}`}
              id={`wallet-tab-${tab.id}`}
              className={cn(tabStyles.tab, isActive && tabStyles.tabActive)}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
