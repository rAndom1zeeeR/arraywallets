"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import type { WalletHistoryFilters } from "@/modules/wallet/domain/wallet-events-filter.utils";
import {
  getWalletHistoryDateFilterLabel,
  hasWalletHistoryDateFilter,
} from "@/modules/wallet/domain/wallet-history-date.utils";
import {
  getWalletPagePath,
  walletHistoryFiltersToQueryOptions,
} from "@/shared/lib/wallet-route.utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface WalletExplorerDateFilterProps {
  address: string;
  filters: WalletHistoryFilters;
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function rangeFromFilters(filters: WalletHistoryFilters): DateRange | undefined {
  if (!filters.dateFrom && !filters.dateTo) {
    return undefined;
  }

  return {
    from: filters.dateFrom ? parseISO(filters.dateFrom) : undefined,
    to: filters.dateTo ? parseISO(filters.dateTo) : undefined,
  };
}

function filtersFromRange(
  filters: WalletHistoryFilters,
  range: DateRange | undefined
): WalletHistoryFilters {
  if (!range?.from) {
    return { ...filters, dateFrom: null, dateTo: null };
  }

  const dateFrom = toIsoDate(range.from);
  const dateTo = toIsoDate(range.to ?? range.from);

  return { ...filters, dateFrom, dateTo };
}

export const WalletExplorerDateFilter = ({
  address,
  filters,
}: WalletExplorerDateFilterProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const committedRange = useMemo(() => rangeFromFilters(filters), [filters]);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(committedRange);

  useEffect(() => {
    if (open) {
      setDraftRange(committedRange);
    }
  }, [open, committedRange]);

  const label = getWalletHistoryDateFilterLabel(filters);
  const hasDateFilter = hasWalletHistoryDateFilter(filters);
  const canApply = draftRange?.from !== undefined;

  const handleApply = () => {
    if (!canApply) {
      return;
    }

    const nextFilters = filtersFromRange(filters, draftRange);
    router.push(
      getWalletPagePath(address, {
        tab: "events",
        ...walletHistoryFiltersToQueryOptions(nextFilters),
      })
    );
    setOpen(false);
  };

  const handleClear = () => {
    router.push(
      getWalletPagePath(address, {
        tab: "events",
        ...walletHistoryFiltersToQueryOptions({
          ...filters,
          dateFrom: null,
          dateTo: null,
        }),
      })
    );
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            explorerStyles.filterChip,
            "text-xs lg:text-sm",
            hasDateFilter && "border-primary/40 bg-explorer-surface-2"
          )}
          aria-label="Filter by date"
        >
          <CalendarIcon className="size-3" aria-hidden />
          {label}
          <ChevronDown className="size-3" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          selected={draftRange}
          onSelect={setDraftRange}
          numberOfMonths={2}
          defaultMonth={draftRange?.from ?? draftRange?.to ?? new Date()}
          disabled={date => date > new Date()}
        />
        <div className="flex items-center justify-end gap-2 border-t border-border p-3">
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            Clear
          </Button>
          <Button type="button" size="sm" onClick={handleApply} disabled={!canApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
