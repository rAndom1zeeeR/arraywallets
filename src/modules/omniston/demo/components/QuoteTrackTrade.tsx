"use client";

import { matchQuoteByType } from "@ston-fi/omniston-sdk-react";

import { useTradeTrackState } from "@/modules/omniston/demo/providers/trade-track";
import { TradeTrackSwap } from "@/modules/omniston/demo/components/TradeTrackSwap";
import { TradeTrackOrder } from "@/modules/omniston/demo/components/TradeTrackOrder";

export function QuoteTrackTrade({ ...props }: { className?: string }) {
  const { quote: trackingQuote } = useTradeTrackState();

  if (!trackingQuote) return null;

  return matchQuoteByType(trackingQuote, {
    swap: () => <TradeTrackSwap {...props} />,
    order: () => <TradeTrackOrder {...props} />,
  });
}
