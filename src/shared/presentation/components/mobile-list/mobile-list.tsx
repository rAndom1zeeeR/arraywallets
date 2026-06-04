import type { ReactNode } from "react";
import { mobileListStyles } from "@/shared/presentation/components/mobile-list/mobile-list.styles";
import { cn } from "@/shared/lib/utils";

interface MobileListProps {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function MobileList({ children, className, "aria-label": ariaLabel }: MobileListProps) {
  return (
    <ul className={cn(mobileListStyles.root, className)} role="list" aria-label={ariaLabel}>
      {children}
    </ul>
  );
}

interface MobileListGroupHeaderProps {
  children: ReactNode;
  className?: string;
}

export function MobileListGroupHeader({ children, className }: MobileListGroupHeaderProps) {
  return (
    <li className={cn(mobileListStyles.groupHeader, className)} role="presentation">
      {children}
    </li>
  );
}

interface MobileListItemProps {
  children: ReactNode;
  className?: string;
}

export function MobileListItem({ children, className }: MobileListItemProps) {
  return <li className={cn(mobileListStyles.item, className)}>{children}</li>;
}

interface MobileListIconProps {
  children: ReactNode;
  className?: string;
}

export function MobileListIcon({ children, className }: MobileListIconProps) {
  return <div className={cn(mobileListStyles.iconWrap, className)} aria-hidden>
    {children}
  </div>;
}

interface MobileListBodyProps {
  children: ReactNode;
  className?: string;
}

export function MobileListBody({ children, className }: MobileListBodyProps) {
  return <div className={cn(mobileListStyles.body, className)}>{children}</div>;
}

interface MobileListAmountProps {
  children: ReactNode;
  tone?: "profit" | "loss" | "neutral";
  className?: string;
}

export function MobileListAmount({ children, tone = "neutral", className }: MobileListAmountProps) {
  return (
    <div
      className={cn(
        mobileListStyles.amount,
        tone === "profit" && mobileListStyles.amountProfit,
        tone === "loss" && mobileListStyles.amountLoss,
        className
      )}
    >
      {children}
    </div>
  );
}
