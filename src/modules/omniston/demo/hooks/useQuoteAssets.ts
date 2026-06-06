import type { AssetId, Quote } from "@ston-fi/omniston-sdk-react";
import { useMemo } from "react";

import type { Asset } from "@/modules/omniston/demo/models/asset";
import { getNativeAssetIdForChain } from "@/modules/omniston/demo/models/asset-id";
import { useAssets } from "@/modules/omniston/demo/providers/assets";

/** Assets required to render a quote (input/output + native gas tokens). */
export function getMissingQuoteDisplayAssets(
  quote: Quote,
  getAssetById: (assetId: AssetId) => Asset | undefined,
): AssetId[] {
  const requiredAssetIds = [
    quote.inputAsset,
    quote.outputAsset,
    getNativeAssetIdForChain(quote.inputAsset.chain.$case),
    getNativeAssetIdForChain(quote.outputAsset.chain.$case),
  ];

  return requiredAssetIds.filter((assetId) => !getAssetById(assetId));
}

export interface QuoteAssets {
  inputAsset: Asset;
  inputNativeAsset: Asset;
  outputAsset: Asset;
  outputNativeAsset: Asset;
}

export function useQuoteAssets(quote: Quote): QuoteAssets | null {
  const { getAssetById } = useAssets();

  return useMemo(() => {
    const inputAsset = getAssetById(quote.inputAsset);
    const inputNativeAsset = getAssetById(getNativeAssetIdForChain(quote.inputAsset.chain.$case));
    const outputAsset = getAssetById(quote.outputAsset);
    const outputNativeAsset = getAssetById(getNativeAssetIdForChain(quote.outputAsset.chain.$case));

    if (!inputAsset || !inputNativeAsset || !outputAsset || !outputNativeAsset) {
      return null;
    }

    return {
      inputAsset,
      inputNativeAsset,
      outputAsset,
      outputNativeAsset,
    };
  }, [quote.inputAsset, quote.outputAsset, getAssetById]);
}
