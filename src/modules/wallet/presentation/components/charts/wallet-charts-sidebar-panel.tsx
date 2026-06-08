"use client";

import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";
import { WalletChartsToggleButton } from "@/modules/wallet/presentation/components/charts/wallet-charts-toggle";

interface WalletChartsSidebarPanelProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  className?: string;
}

/**
 * Sidebar block to toggle wallet analytics charts visibility.
 */
export const WalletChartsSidebarPanel = ({
  visible,
  onVisibleChange,
  className,
}: WalletChartsSidebarPanelProps) => {
  return (
    <section className={cn(explorerStyles.card, className)} aria-label="Charts visibility">
      <div className="px-5 py-4">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">Charts</span>
        <WalletChartsToggleButton
          visible={visible}
          onVisibleChange={onVisibleChange}
          embedded
          className="mt-3"
        />
      </div>
    </section>
  );
};
