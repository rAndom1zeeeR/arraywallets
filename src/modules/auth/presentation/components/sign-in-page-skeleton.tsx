import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

interface SignInPageSkeletonProps {
  className?: string;
}

/**
 * Loading layout for the sign-in page.
 */
export function SignInPageSkeleton({ className }: SignInPageSkeletonProps) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-6 px-3 py-12 sm:gap-8 sm:px-4 sm:py-16",
        className
      )}
      aria-busy="true"
      aria-label="Loading sign in"
    >
      <div className="w-full space-y-2 text-center">
        <Skeleton className="mx-auto h-8 w-28" />
        <Skeleton className="mx-auto h-4 w-56" />
      </div>

      <Skeleton className="h-11 w-full max-w-sm rounded-lg" />

      <div className="relative w-full max-w-sm">
        <div className="absolute inset-x-0 top-1/2 border-t border-border" />
        <Skeleton className="relative mx-auto h-4 w-8 bg-background" />
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Skeleton className="h-11 w-full rounded-lg" />
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>

      <Skeleton className="h-4 w-24" />
    </main>
  );
}
