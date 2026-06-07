import { pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface WalletsListPageSkeletonProps {
  className?: string;
}

/**
 * Loading layout for the wallets list page.
 */
export function WalletsListPageSkeleton({ className }: WalletsListPageSkeletonProps) {
  return (
    <main className={cn(pageStyles.main, className)} aria-busy="true" aria-label="Loading wallets">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-32 sm:h-10 sm:w-40" />
        <Skeleton className="h-4 w-56" />
      </div>

      <section className={cn(pageStyles.infoCard, "mb-6 space-y-3")}>
        <Skeleton className="h-4 w-36" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-28" />
        </div>
      </section>

      <section className={cn(pageStyles.section, "space-y-4")}>
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>

        <div className="hidden md:block">
          <div className="border-b border-border">
            <div className="flex gap-4 px-4 py-3">
              {["w-24", "w-16", "w-14", "w-14", "w-20", "w-10"].map(width => (
                <Skeleton key={width} className={cn("h-3", width)} />
              ))}
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 border-b border-border/60 px-4 py-4">
              <Skeleton className="h-4 w-full max-w-xs" />
              <Skeleton className="h-6 w-20 rounded-md" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="hidden h-4 w-28 md:block" />
              <Skeleton className="ml-auto h-4 w-12" />
            </div>
          ))}
        </div>

        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-lg border border-border/60 p-4">
              <Skeleton className="mb-2 h-4 w-full max-w-xs" />
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-4 w-12" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
