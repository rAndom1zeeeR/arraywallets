import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface ProfilePageSkeletonProps {
  className?: string;
}

/**
 * Loading layout for the profile page.
 */
export function ProfilePageSkeleton({ className }: ProfilePageSkeletonProps) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-[60vh] max-w-lg flex-col gap-6 px-3 py-12 sm:px-4 sm:py-16",
        className
      )}
      aria-busy="true"
      aria-label="Loading profile"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="divide-border/60 flex flex-col divide-y rounded-lg border border-border/60">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-32 sm:w-40" />
          </div>
        ))}
      </div>

      <Skeleton className="h-4 w-24" />
    </main>
  );
}
