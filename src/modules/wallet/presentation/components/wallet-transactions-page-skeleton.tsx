import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

function WalletSidebarSkeleton() {
  return (
    <div className={explorerStyles.card}>
      <div className={explorerStyles.cardBody}>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-full" />
        </div>

        <div className={explorerStyles.divider} />

        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        <Skeleton className="mt-1 h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

function WalletBalancesSkeleton() {
  return (
    <section className={explorerStyles.card} aria-label="Loading current balance" aria-busy="true">
      <div className={explorerStyles.cardHeader}>
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="space-y-3 px-5 py-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </section>
  );
}

function WalletMobileSummarySkeleton() {
  return (
    <div className={cn(explorerStyles.card, "mx-4 mt-4 lg:hidden")}>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="size-7 shrink-0 rounded-lg" />
        </div>
        <div className={explorerStyles.divider} />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

function WalletTabsSkeleton() {
  return (
    <div className={explorerStyles.tabList} aria-hidden>
      <Skeleton className="h-9 w-20 shrink-0 rounded-none" />
      <Skeleton className="h-9 w-16 shrink-0 rounded-none" />
      <Skeleton className="h-9 w-12 shrink-0 rounded-none" />
      <Skeleton className="h-9 w-20 shrink-0 rounded-none" />
      <div className="ml-auto hidden items-center gap-2 px-2 lg:flex">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
    </div>
  );
}

function WalletHistoryTableSkeleton() {
  return (
    <div className={explorerStyles.tableShell}>
      <div className={explorerStyles.tableScroll}>
        <div className={explorerStyles.tableMinWidth}>
          <div className={explorerStyles.tableHeader}>
            <Skeleton className="col-span-1 h-3 w-6" />
            <Skeleton className="col-span-3 h-3 w-14" />
            <Skeleton className="col-span-3 h-3 w-16" />
            <Skeleton className="col-span-3 h-3 w-14" />
            <Skeleton className="col-span-2 ml-auto h-3 w-10" />
          </div>
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={explorerStyles.tableRow}>
              <Skeleton className="col-span-1 size-8 rounded-xl" />
              <div className="col-span-3 space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="col-span-3 h-4 w-32" />
              <Skeleton className="col-span-3 h-4 w-20" />
              <Skeleton className="col-span-2 ml-auto h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WalletHistoryMobileListSkeleton() {
  return (
    <div className="space-y-3 lg:hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className={cn(explorerStyles.card, "p-4")}>
          <div className="flex items-start gap-3">
            <Skeleton className="size-8 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface WalletTransactionsPageSkeletonProps {
  className?: string;
}

/**
 * Loading layout for wallet explorer — mirrors sidebar, tabs, and history table.
 */
export function WalletTransactionsPageSkeleton({ className }: WalletTransactionsPageSkeletonProps) {
  return (
    <div className={cn(explorerStyles.content, className)} aria-busy="true" aria-label="Loading wallet data">
      <WalletMobileSummarySkeleton />

      <aside className={cn(explorerStyles.sidebar, "hidden lg:flex")}>
        <WalletSidebarSkeleton />
        <WalletBalancesSkeleton />
      </aside>

      <div className={explorerStyles.main}>
        <div className="mx-4 mt-5 lg:mx-0 lg:mt-0">
          <WalletTabsSkeleton />
        </div>

        <div className={cn(explorerStyles.tabPanel, "mt-4 space-y-4 lg:mt-4")}>
          <WalletHistoryMobileListSkeleton />
          <div className="hidden lg:block">
            <WalletHistoryTableSkeleton />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 lg:px-0">
            <Skeleton className="h-4 w-28" />
            <div className="flex gap-2">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
