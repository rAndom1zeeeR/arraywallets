import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface OmnistonDemoPageSkeletonProps {
  className?: string;
}

/**
 * Loading layout for Omnistone swap / transfer page.
 */
export function OmnistonDemoPageSkeleton({ className }: OmnistonDemoPageSkeletonProps) {
  return (
    <div
      className={cn(explorerStyles.page, "px-3 py-4 sm:px-8 sm:py-6", className)}
      aria-busy="true"
      aria-label="Loading Omnistone"
    >
      <div className="mx-auto flex w-full max-w-[500px] flex-col gap-3 pt-1 sm:gap-4 sm:pt-4 md:pt-8">
        <div className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:flex sm:flex-wrap sm:justify-end sm:pb-4">
          <Skeleton className="h-10 w-full rounded-lg sm:w-36" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-36" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Skeleton className="hidden h-8 w-20 sm:block" />
          <div className="flex w-full items-center justify-end gap-1.5 sm:ml-auto sm:w-auto sm:gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-explorer-surface">
          <div className="border-b border-border p-3 sm:p-4">
            <div className="mb-3 flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <div className="flex justify-center py-2">
            <Skeleton className="size-8 rounded-full" />
          </div>
          <div className="border-t border-border p-3 sm:p-4">
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        </div>

        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
}
