"use client";

import { RefreshCw } from "lucide-react";

import { useQuoteRefresh } from "@/modules/omniston/demo/hooks/useQuoteRefresh";
import { Button } from "@/modules/omniston/demo/components/ui/button";
import { cn } from "@/modules/omniston/demo/lib/utils";

export const QuoteRefreshButton = () => {
  const { refresh, isRefreshing, canRefresh } = useQuoteRefresh();

  return (
    <Button
      type="button"
      variant="outline"
      className="size-8 p-0"
      disabled={!canRefresh || isRefreshing}
      onClick={refresh}
      aria-label="Refresh exchange rate"
    >
      <RefreshCw className={cn("size-4", isRefreshing && "animate-spin")} aria-hidden />
    </Button>
  );
};
