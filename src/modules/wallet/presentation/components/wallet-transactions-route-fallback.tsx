import { WalletMobileToolbar } from "@/modules/wallet/presentation/components/wallet-mobile-toolbar";
import { WalletTransactionsPageSkeleton } from "@/modules/wallet/presentation/components/wallet-transactions-page-skeleton";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface WalletTransactionsRouteFallbackProps {
  address?: string;
  className?: string;
}

/**
 * Full route-level fallback for wallet explorer (toolbar, breadcrumb, content skeleton).
 */
export function WalletTransactionsRouteFallback({
  address,
  className,
}: WalletTransactionsRouteFallbackProps) {
  return (
    <div className={cn(explorerStyles.page, className)}>
      <WalletMobileToolbar />

      <div className={cn(explorerStyles.breadcrumb, "hidden lg:flex")}>
        <Skeleton className="h-3 w-20" />
        <Skeleton className="size-3 shrink-0 rounded-full" />
        {address ? (
          <span className="min-w-0 font-medium text-foreground break-all">{address}</span>
        ) : (
          <Skeleton className="h-3 w-72 max-w-full" />
        )}
      </div>

      <WalletTransactionsPageSkeleton />
    </div>
  );
}
