"use client";

import { useQuery } from "@tanstack/react-query";
import { type Quote, matchQuoteByType } from "@ston-fi/omniston-sdk-react";
import { useMemo } from "react";

import { Copy } from "@/modules/omniston/demo/components/ui/copy";
import { DescriptionList } from "@/modules/omniston/demo/components/ui/description-list";
import { useRfq } from "@/modules/omniston/demo/hooks/useRfq";
import { getMissingQuoteDisplayAssets } from "@/modules/omniston/demo/hooks/useQuoteAssets";
import { Chain } from "@/modules/omniston/demo/models/chain";
import { cn, trimStringWithEllipsis } from "@/modules/omniston/demo/lib/utils";
import { serializeAssetId } from "@/modules/omniston/demo/models/asset-id";
import { useAssets } from "@/modules/omniston/demo/providers/assets";
import { useTradeTrackState } from "@/modules/omniston/demo/providers/trade-track";
import { QuotePreviewSwap } from "@/modules/omniston/demo/components/QuotePreviewSwap";
import { QuotePreviewOrder } from "@/modules/omniston/demo/components/QuotePreviewOrder";
import { RfqEventHistory } from "@/modules/omniston/demo/components/RfqEventHistory";

export const QuotePreview = (props: { className?: string }) => {
  const { data: quoteEvent, error, isFetching } = useRfq();
  const quote = quoteEvent?.$case === "quoteUpdated" ? quoteEvent.value : undefined;

  const { quote: trackingQuote } = useTradeTrackState();

  if (!isFetching && error == null && !trackingQuote) {
    return null;
  }

  return (
    <div {...props} className={cn("flex flex-col gap-2 p-4 border rounded-md", props.className)}>
      {error ? (
        <QuoteError error={error} />
      ) : quote ? (
        <QuotePreviewWithAssets quote={quote} />
      ) : trackingQuote ? (
        <QuotePreviewWithAssets quote={trackingQuote} />
      ) : quoteEvent?.$case === "noQuote" ? (
        <p className="text-sm text-muted-foreground">
          Resolvers returned no quote for this swap. Change the pair or check Swap settings (SWAP +
          ORDER).
        </p>
      ) : isFetching ? (
        <p className="text-sm text-muted-foreground">Waiting for resolvers…</p>
      ) : null}

      <RfqEventHistory />
    </div>
  );
};

const QuoteError = ({ error }: { error: unknown }) => {
  const errorMessage =
    error instanceof Error
      ? `[${(error as any).code}] ${error.message}`
      : "An unknown error occurred";

  return (
    <div className="text-red-500">
      <span>Error:&nbsp;</span>
      <span className="overflow-hidden text-ellipsis">{errorMessage}</span>
    </div>
  );
};

const QuotePreviewWithAssets = ({ quote }: { quote: Quote }) => {
  const { populateAssets, getAssetById } = useAssets();

  const missingDisplayAssets = useMemo(
    () => getMissingQuoteDisplayAssets(quote, getAssetById),
    [quote, getAssetById],
  );

  const tonJettonsToPopulate = useMemo(
    () =>
      missingDisplayAssets.filter(
        (assetId) =>
          assetId.chain.$case === Chain.TON && assetId.chain.value.kind.$case === "jetton",
      ),
    [missingDisplayAssets],
  );

  const quoteAssetsQuery = useQuery({
    queryKey: ["quoteAssets", quote.quoteId, ...missingDisplayAssets.map(serializeAssetId)],
    queryFn: () => populateAssets(tonJettonsToPopulate).then(() => null),
    enabled: tonJettonsToPopulate.length > 0,
    retry: 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
  });

  if (quoteAssetsQuery.isError) {
    return <QuoteError error={quoteAssetsQuery.error} />;
  }

  if (missingDisplayAssets.length > 0) {
    const isPopulatingJettons =
      tonJettonsToPopulate.length > 0 &&
      (quoteAssetsQuery.isFetching || quoteAssetsQuery.status === "pending");

    if (isPopulatingJettons) {
      return <p className="text-sm text-muted-foreground">Loading quote assets…</p>;
    }

    return (
      <QuoteError
        error={
          new Error(
            `Quote asset metadata is unavailable for ${missingDisplayAssets.map(serializeAssetId).join(", ")}`,
          )
        }
      />
    );
  }

  return <QuotePreviewPresenter quote={quote} />;
};

const QuotePreviewPresenter = ({ quote }: { quote: Quote }) => {
  return (
    <>
      <QuoteIdPresenter quoteId={quote.quoteId} rfqId={quote.rfqId} />
      <hr />
      <QuoteDataPresenter quote={quote} />
    </>
  );
};

const QuoteIdPresenter = ({ quoteId, rfqId }: { quoteId: Quote["quoteId"]; rfqId: string }) => {
  return (
    <DescriptionList>
      <li>
        <span>RFQ ID:</span>
        <Copy value={rfqId}>{trimStringWithEllipsis(rfqId, 6)}</Copy>
      </li>
      <li>
        <span>Quote ID:</span>
        <Copy value={quoteId}>{trimStringWithEllipsis(quoteId, 6)}</Copy>
      </li>
    </DescriptionList>
  );
};

export const QuoteDataPresenter = ({ quote }: { quote: Quote }) => {
  return matchQuoteByType(quote, {
    swap: (swapQuote) => <QuotePreviewSwap quote={swapQuote} />,
    order: (orderQuote) => <QuotePreviewOrder quote={orderQuote} />,
  });
};
