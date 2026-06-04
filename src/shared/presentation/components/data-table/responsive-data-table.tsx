import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface ResponsiveDataTableProps {
  /** Card/list feed shown below `md` breakpoint. */
  mobile: ReactNode;
  /** Standard table — hidden on small screens when `mobile` is set. */
  desktop: ReactNode;
  className?: string;
}

/**
 * Tonviewer-style split: vertical feed on mobile, table from `md` up.
 */
export function ResponsiveDataTable({ mobile, desktop, className }: ResponsiveDataTableProps) {
  return (
    <div className={className}>
      <div className="md:hidden">{mobile}</div>
      <div className="hidden md:block">{desktop}</div>
    </div>
  );
}

interface DesktopTableScrollProps {
  children: ReactNode;
  className?: string;
}

/** Wraps desktop table with horizontal scroll only when needed. */
export function DesktopTableScroll({ children, className }: DesktopTableScrollProps) {
  return <div className={cn("hidden md:block", className)}>{children}</div>;
}
