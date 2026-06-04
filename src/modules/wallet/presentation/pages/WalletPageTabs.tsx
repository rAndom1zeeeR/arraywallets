import Link from "next/link";
import { getWalletPagePath, type WalletTabId } from "@/shared/lib/wallet-route.utils";
import { cn } from "@/shared/lib/utils";

interface WalletTabConfig {
  id: WalletTabId;
  label: string;
}

const WALLET_TABS: WalletTabConfig[] = [
  { id: "events", label: "Events" },
  { id: "swaps", label: "Swaps" },
  { id: "pnl", label: "PnL" },
];

export interface WalletPageTabsProps {
  address: string;
  activeTab: WalletTabId;
  currentPage: number;
  swapsOnly: boolean;
}

export function WalletPageTabs({ address, activeTab, currentPage, swapsOnly }: WalletPageTabsProps) {
  return (
    <nav className="mb-4 border-b border-gray-200 dark:border-gray-800" aria-label="Wallet sections">
      <div className="flex gap-1" role="tablist">
        {WALLET_TABS.map(tab => {
          const isActive = tab.id === activeTab;

          return (
            <Link
              key={tab.id}
              href={getWalletPagePath(address, {
                tab: tab.id,
                page:
                  (tab.id === "events" || tab.id === "pnl") && currentPage > 1 ? currentPage : undefined,
                swaps: tab.id === "events" && swapsOnly,
              })}
              role="tab"
              aria-selected={isActive}
              aria-controls={`wallet-tabpanel-${tab.id}`}
              id={`wallet-tab-${tab.id}`}
              className={cn(
                "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
