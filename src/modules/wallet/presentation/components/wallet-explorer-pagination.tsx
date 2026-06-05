import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EVENTS_PAGE_SIZE } from "@/modules/wallet/presentation/components/EventsPagination";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";
import { getWalletPagePath, walletHistoryFiltersToQueryOptions } from "@/shared/lib/wallet-route.utils";
import { cn } from "@/shared/lib/utils";

interface WalletExplorerPaginationProps {
  address: string;
  currentPage: number;
  totalPages: number;
  totalActions: number;
  filters: WalletHistoryFilters;
  className?: string;
}

function buildPageHref(address: string, page: number, filters: WalletHistoryFilters): string {
  return getWalletPagePath(address, {
    tab: "events",
    page: page > 1 ? page : undefined,
    ...walletHistoryFiltersToQueryOptions(filters),
  });
}

function getPageNumbers(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: Array<number | "ellipsis"> = [1];

  if (current > 3) {
    pages.push("ellipsis");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let p = start; p <= end; p++) {
    pages.push(p);
  }

  if (current < total - 2) {
    pages.push("ellipsis");
  }

  pages.push(total);
  return pages;
}

export const WalletExplorerPagination = ({
  address,
  currentPage,
  totalPages,
  totalActions,
  filters,
  className,
}: WalletExplorerPaginationProps) => {
  if (totalPages <= 1) {
    return (
      <p className="py-2 text-xs text-muted-foreground">
        {totalActions} row{totalActions === 1 ? "" : "s"}
      </p>
    );
  }

  const from = (currentPage - 1) * EVENTS_PAGE_SIZE + 1;
  const to = Math.min(currentPage * EVENTS_PAGE_SIZE, totalActions);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      className={cn(
        "flex flex-col gap-3 py-5 lg:flex-row lg:items-center lg:justify-between lg:py-2",
        className
      )}
      aria-label="History pagination"
    >
      <span className="hidden text-xs text-muted-foreground lg:inline">
        Showing {from}–{to} of {totalActions} actions
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {currentPage <= 1 ? (
          <span
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40"
            aria-disabled
          >
            <ChevronLeft className="size-3" aria-hidden />
            Prev
          </span>
        ) : (
          <Link
            href={buildPageHref(address, currentPage - 1, filters)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-explorer-surface px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-3" aria-hidden />
            Prev
          </Link>
        )}

        {pageNumbers.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="text-xs text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <Link
              key={item}
              href={buildPageHref(address, item, filters)}
              aria-label={`Page ${item}`}
              aria-current={item === currentPage ? "page" : undefined}
              className={cn(
                "flex size-8 items-center justify-center rounded-lg text-xs font-semibold",
                item === currentPage
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-explorer-surface text-foreground hover:bg-explorer-surface-2"
              )}
            >
              {item}
            </Link>
          )
        )}

        {currentPage >= totalPages ? (
          <span
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground/40"
            aria-disabled
          >
            Next
            <ChevronRight className="size-3" aria-hidden />
          </span>
        ) : (
          <Link
            href={buildPageHref(address, currentPage + 1, filters)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-explorer-surface px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-3" aria-hidden />
          </Link>
        )}
      </div>
    </nav>
  );
};
