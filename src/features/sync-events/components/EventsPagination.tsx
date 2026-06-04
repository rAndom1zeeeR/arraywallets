import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/utils";

export const EVENTS_PAGE_SIZE = 100;

interface EventsPaginationProps {
  currentPage: number;
  totalPages: number;
  totalEvents: number;
  address: string;
}

function buildPageHref(address: string, page: number): string {
  const params = new URLSearchParams();
  params.set("address", address);
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function EventsPagination({
  currentPage,
  totalPages,
  totalEvents,
  address,
}: EventsPaginationProps) {
  if (totalPages <= 1) {
    return (
      <p className="mt-4 text-sm text-gray-500">
        {totalEvents} event{totalEvents === 1 ? "" : "s"}
      </p>
    );
  }

  const from = (currentPage - 1) * EVENTS_PAGE_SIZE + 1;
  const to = Math.min(currentPage * EVENTS_PAGE_SIZE, totalEvents);

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav
      className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Events pagination"
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Events {from}–{to} of {totalEvents} · page {currentPage} of {totalPages}
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
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm text-gray-400"
              aria-hidden
            >
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
        className="inline-flex min-w-9 items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-300 dark:border-gray-700 dark:text-gray-600"
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
        "inline-flex min-w-9 items-center justify-center rounded-md border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-sky-500 bg-sky-500 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
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
