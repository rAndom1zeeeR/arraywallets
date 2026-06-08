import type { ReactNode } from "react";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
}

/**
 * Card wrapper for Recharts visualizations on wallet pages.
 */
export const ChartCard = ({
  title,
  description,
  children,
  className,
  isEmpty = false,
  emptyMessage = "Not enough data yet.",
}: ChartCardProps) => {
  return (
    <section className={cn(explorerStyles.card, className)} aria-label={title}>
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="px-2 py-3 sm:px-4 sm:py-4">
        {isEmpty ? (
          <p className="px-2 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
};
