import { useEffect, useRef, useState } from "react";

import { useRfq } from "@/modules/omniston/demo/hooks/useRfq";
import { useSwapForm } from "@/modules/omniston/demo/providers/swap-form";
import { useTradeTrackState } from "@/modules/omniston/demo/providers/trade-track";

const REFRESH_TIMEOUT_MS = 10_000;

/**
 * Re-fetches the current RFQ subscription to refresh exchange rates.
 *
 * RFQ uses a long-lived observable query — `isFetching` stays true for the whole
 * subscription, so refresh UI uses local state + `dataUpdatedAt` instead.
 */
export const useQuoteRefresh = () => {
  const swapForm = useSwapForm();
  const { quote: trackingQuote } = useTradeTrackState();
  const { refetch, dataUpdatedAt } = useRfq();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshStartedAtRef = useRef<number | null>(null);

  const canRefresh =
    !trackingQuote &&
    Boolean(
      swapForm.inputAssetId &&
        swapForm.outputAssetId &&
        (swapForm.inputUnits || swapForm.outputUnits),
    );

  useEffect(() => {
    if (!isRefreshing || refreshStartedAtRef.current === null) {
      return;
    }

    if (dataUpdatedAt >= refreshStartedAtRef.current) {
      setIsRefreshing(false);
      refreshStartedAtRef.current = null;
    }
  }, [isRefreshing, dataUpdatedAt]);

  useEffect(() => {
    if (!isRefreshing) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsRefreshing(false);
      refreshStartedAtRef.current = null;
    }, REFRESH_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [isRefreshing]);

  const refresh = () => {
    refreshStartedAtRef.current = Date.now();
    setIsRefreshing(true);
    void refetch();
  };

  return {
    refresh,
    isRefreshing,
    canRefresh,
  };
};
