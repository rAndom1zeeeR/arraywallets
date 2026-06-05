import { format, isValid, parseISO } from "date-fns";
import type { Prisma } from "@/shared/infrastructure/api/prisma-client";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";

const HISTORY_DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isWalletHistoryDateParam(value: string): boolean {
  if (!HISTORY_DATE_PARAM_PATTERN.test(value)) {
    return false;
  }

  const parsed = parseISO(value);
  return isValid(parsed) && format(parsed, "yyyy-MM-dd") === value;
}

export function parseWalletHistoryDateParam(value: string | undefined): string | null {
  if (!value || !isWalletHistoryDateParam(value)) {
    return null;
  }

  return value;
}

export function parseWalletHistoryDateRange(
  fromParam: string | undefined,
  toParam: string | undefined
): Pick<WalletHistoryFilters, "dateFrom" | "dateTo"> {
  const dateFrom = parseWalletHistoryDateParam(fromParam);
  const dateTo = parseWalletHistoryDateParam(toParam);

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return { dateFrom: dateTo, dateTo: dateFrom };
  }

  return { dateFrom, dateTo };
}

function utcDayStart(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function utcDayEnd(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

export function buildEventTimestampWhere(
  filters: Pick<WalletHistoryFilters, "dateFrom" | "dateTo">
): Prisma.DateTimeFilter | undefined {
  const range: Prisma.DateTimeFilter = {};

  if (filters.dateFrom) {
    range.gte = utcDayStart(filters.dateFrom);
  }

  if (filters.dateTo) {
    range.lte = utcDayEnd(filters.dateTo);
  }

  if (range.gte === undefined && range.lte === undefined) {
    return undefined;
  }

  return range;
}

export function hasWalletHistoryDateFilter(
  filters: Pick<WalletHistoryFilters, "dateFrom" | "dateTo">
): boolean {
  return filters.dateFrom !== null || filters.dateTo !== null;
}

export function getWalletHistoryDateFilterLabel(
  filters: Pick<WalletHistoryFilters, "dateFrom" | "dateTo">
): string {
  if (!filters.dateFrom && !filters.dateTo) {
    return "Date";
  }

  const formatLabel = (iso: string) => format(parseISO(iso), "d MMM yyyy");

  if (filters.dateFrom && filters.dateTo) {
    if (filters.dateFrom === filters.dateTo) {
      return formatLabel(filters.dateFrom);
    }

    return `${formatLabel(filters.dateFrom)} – ${formatLabel(filters.dateTo)}`;
  }

  if (filters.dateFrom) {
    return `From ${formatLabel(filters.dateFrom)}`;
  }

  return `Until ${formatLabel(filters.dateTo!)}`;
}
