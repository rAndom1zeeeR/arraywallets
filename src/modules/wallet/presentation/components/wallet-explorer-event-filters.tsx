"use client";

import Link from "next/link";
import { ChevronDown, MoreVertical } from "lucide-react";
import { WalletExplorerDateFilter } from "@/modules/wallet/presentation/components/wallet-explorer-date-filter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  getWalletActionTypeFilterLabel,
  getWalletDirectionFilterLabel,
  getWalletHistoryStatusFilterLabel,
  WALLET_HISTORY_DIRECTION_FILTER_OPTIONS,
  WALLET_HISTORY_FILTER_ALL,
  WALLET_HISTORY_STATUS_FILTER_OPTIONS,
  WALLET_EVENT_TYPE_FILTER_OPTIONS,
  type WalletHistoryFilters,
} from "@/modules/wallet/domain/wallet-events-filter.utils";
import { getWalletPagePath, walletHistoryFiltersToQueryOptions } from "@/shared/lib/wallet-route.utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface WalletExplorerEventFiltersProps {
  address: string;
  currentPage: number;
  filters: WalletHistoryFilters;
}

const buildEventsPath = (
  address: string,
  page: number,
  filters: WalletHistoryFilters
): string =>
  getWalletPagePath(address, {
    tab: "events",
    page: page > 1 ? page : undefined,
    ...walletHistoryFiltersToQueryOptions(filters),
  });

export const WalletExplorerEventFilters = ({
  address,
  currentPage,
  filters,
}: WalletExplorerEventFiltersProps) => {
  const typeLabel =
    filters.actionType === WALLET_HISTORY_FILTER_ALL
      ? "Type"
      : getWalletActionTypeFilterLabel(filters.actionType);
  const statusLabel =
    filters.actionStatus === WALLET_HISTORY_FILTER_ALL
      ? "Status"
      : getWalletHistoryStatusFilterLabel(filters.actionStatus);
  const directionLabel =
    filters.direction === WALLET_HISTORY_FILTER_ALL
      ? "Direction"
      : getWalletDirectionFilterLabel(filters.direction);

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className={cn(
            explorerStyles.filterChip,
            filters.actionType !== WALLET_HISTORY_FILTER_ALL &&
              "border-primary/40 bg-explorer-surface-2"
          )}
        >
          {typeLabel}
          <ChevronDown className="size-3" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
          {WALLET_EVENT_TYPE_FILTER_OPTIONS.map(option => (
            <DropdownMenuItem key={option} asChild>
              <Link
                href={buildEventsPath(address, 1, {
                  ...filters,
                  actionType: option,
                })}
              >
                {getWalletActionTypeFilterLabel(option)}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className={cn(
            explorerStyles.filterChip,
            filters.actionStatus !== WALLET_HISTORY_FILTER_ALL &&
              "border-primary/40 bg-explorer-surface-2"
          )}
        >
          {statusLabel}
          <ChevronDown className="size-3" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {WALLET_HISTORY_STATUS_FILTER_OPTIONS.map(option => (
            <DropdownMenuItem key={option} asChild>
              <Link
                href={buildEventsPath(address, 1, {
                  ...filters,
                  actionStatus: option,
                })}
              >
                {getWalletHistoryStatusFilterLabel(option)}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          type="button"
          className={cn(
            explorerStyles.filterChip,
            filters.direction !== WALLET_HISTORY_FILTER_ALL &&
              "border-primary/40 bg-explorer-surface-2"
          )}
        >
          {directionLabel}
          <ChevronDown className="size-3" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {WALLET_HISTORY_DIRECTION_FILTER_OPTIONS.map(option => (
            <DropdownMenuItem key={option} asChild>
              <Link
                href={buildEventsPath(address, 1, {
                  ...filters,
                  direction: option,
                })}
              >
                {getWalletDirectionFilterLabel(option)}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <WalletExplorerDateFilter address={address} filters={filters} />

      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Per page: 100</span>
        <button
          type="button"
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-explorer-surface text-muted-foreground"
          aria-label="More options"
          disabled
        >
          <MoreVertical className="size-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
};
