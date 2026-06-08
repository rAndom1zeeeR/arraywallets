"use client";

import { BarChart3 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
interface WalletChartsToggleButtonProps {
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  className?: string;
  /** Full-width style for sidebar / mobile summary blocks */
  embedded?: boolean;
}

/**
 * Toggles visibility of wallet analytics charts on explorer tabs.
 */
export function WalletChartsToggleButton({
  visible,
  onVisibleChange,
  className,
  embedded = false,
}: WalletChartsToggleButtonProps) {
  const handleClick = () => {
    onVisibleChange(!visible);
  };

  return (
    <div className={cn(embedded ? "w-full" : "flex justify-end", className)}>
      <Button
        type="button"
        variant="outline"
        size={embedded ? "default" : "sm"}
        onClick={handleClick}
        aria-expanded={visible}
        aria-controls="wallet-charts-section"
        className={cn(embedded && "w-full")}
      >
        <BarChart3 aria-hidden />
        {visible ? "Hide charts" : "Show charts"}
      </Button>
    </div>
  );
}
