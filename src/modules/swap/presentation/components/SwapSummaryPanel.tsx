import { SwapJettonBreakdownPanel } from "@/modules/swap/presentation/components/SwapJettonBreakdownPanel";
import { SwapStatsSidebarPanel } from "@/modules/swap/presentation/components/swap-stats-sidebar-panel";
import type { WalletSwapStatsResult } from "@/modules/swap/application/swap-stats.service";

interface SwapSummaryPanelProps {
  address: string;
  stats: WalletSwapStatsResult;
}

/**
 * @deprecated Use SwapStatsSidebarPanel + SwapJettonBreakdownPanel directly in wallet layout.
 */
export function SwapSummaryPanel({ address, stats }: SwapSummaryPanelProps) {
  return (
    <div className="space-y-4">
      <SwapStatsSidebarPanel address={address} stats={stats} className="lg:hidden" />
      <SwapJettonBreakdownPanel stats={stats} />
    </div>
  );
}
