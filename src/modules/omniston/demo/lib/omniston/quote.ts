import { type AssetId, matchQuoteByType, type Quote } from "@ston-fi/omniston-sdk-react";

import { Chain } from "@/modules/omniston/demo/models/chain";
import { serializeAssetId } from "@/modules/omniston/demo/models/asset-id";

export function collectQuoteAssets(quote: Quote): AssetId[] {
  const assetIds = new Set<AssetId>();

  matchQuoteByType(quote, {
    swap: (swapQuote) => {
      assetIds.add(swapQuote.inputAsset);
      assetIds.add(swapQuote.outputAsset);

      swapQuote.settlementData.value.routes
        .flatMap((route) => route.steps)
        .forEach((step) => {
          assetIds.add(step.inputAsset);
          assetIds.add(step.outputAsset);
        });
    },
    order: (orderQuote) => {
      assetIds.add(orderQuote.inputAsset);
      assetIds.add(orderQuote.outputAsset);
    },
  });

  return Array.from(assetIds);
}

/**
 * TON jettons referenced by a quote that may need unconditional fetch
 * (e.g. restored from localStorage before wallet assets load).
 */
export function collectTonJettonsToPopulate(quote: Quote): AssetId[] {
  const seen = new Set<string>();
  const jettons: AssetId[] = [];

  const addJetton = (assetId: AssetId) => {
    if (assetId.chain.$case !== Chain.TON) return;
    if (assetId.chain.value.kind.$case !== "jetton") return;

    const key = serializeAssetId(assetId);
    if (seen.has(key)) return;

    seen.add(key);
    jettons.push(assetId);
  };

  collectQuoteAssets(quote).forEach(addJetton);

  return jettons;
}
