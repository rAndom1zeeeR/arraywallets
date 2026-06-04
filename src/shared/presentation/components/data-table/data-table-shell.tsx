import type { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";
import { dataTableShellStyles } from "@/shared/presentation/components/data-table/data-table.styles";

interface DataTableShellProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * DropsTab-style section wrapper for tables with optional title and controls.
 */
export function DataTableShell({ title, subtitle, controls, children, className }: DataTableShellProps) {
  return (
    <section className={cn(dataTableShellStyles.section, className)}>
      {(title || controls) && (
        <div className={dataTableShellStyles.header}>
          <div>
            {title && <h2 className={dataTableShellStyles.title}>{title}</h2>}
            {subtitle && <p className={dataTableShellStyles.subtitle}>{subtitle}</p>}
          </div>
          {controls && <div className={dataTableShellStyles.controls}>{controls}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
