import type { ReactNode } from "react";
import Link from "next/link";
import { EVENTS_PAGE_SIZE } from "@/modules/wallet/presentation/components/EventsPagination";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { buttonStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

export const JETTON_PNL_PAGE_SIZE = EVENTS_PAGE_SIZE;

interface JettonPnlPaginationProps {
  currentPage: number;
  totalPages: number;
  totalJettons: number;
  address: string;
}

function buildPageHref(address: string, page: number): string {
  return getWalletPagePath(address, {
    tab: "pnl",
    page: page > 1 ? page : undefined,
  });
}

export function JettonPnlPagination({
  currentPage,
  totalPages,
  totalJettons,
  address,
}: JettonPnlPaginationProps) {
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {totalJettons} token{totalJettons === 1 ? "" : "s"}
      </p>
    );
  }

  const from = (currentPage - 1) * JETTON_PNL_PAGE_SIZE + 1;
  const to = Math.min(currentPage * JETTON_PNL_PAGE_SIZE, totalJettons);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Jetton PnL pagination"
    >
      <p className="text-sm text-muted-foreground">
        Tokens {from}–{to} of {totalJettons} · page {currentPage} of {totalPages}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        <PaginationLink
          href={buildPageHref(address, currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          ← Prev
        </PaginationLink>

        {pageNumbers.map((item, index) =>
          item === "ellipsis" ? (
            <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground" aria-hidden>
              …
            </span>
          ) : (
            <PaginationLink
              key={item}
              href={buildPageHref(address, item)}
              active={item === currentPage}
              aria-label={`Page ${item}`}
              aria-current={item === currentPage ? "page" : undefined}
            >
              {item}
            </PaginationLink>
          )
        )}

        <PaginationLink
          href={buildPageHref(address, currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          Next →
        </PaginationLink>
      </div>
    </nav>
  );
}

interface PaginationLinkProps {
  href: string;
  children: ReactNode;
  disabled?: boolean;
  active?: boolean;
  "aria-label"?: string;
  "aria-current"?: "page";
}

function PaginationLink({
  href,
  children,
  disabled = false,
  active = false,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
}: PaginationLinkProps) {
  if (disabled) {
    return (
      <span
        className="inline-flex min-w-9 items-center justify-center rounded-lg border border-border/60 px-3 py-1.5 text-sm text-muted-foreground/40"
        aria-disabled="true"
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={cn(
        buttonStyles.secondary,
        "min-w-9 px-3 py-1.5",
        active && "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
      )}
    >
      {children}
    </Link>
  );
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
