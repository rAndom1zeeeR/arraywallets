import { useEffect } from "react";

import { useRfq } from "@/modules/omniston/demo/hooks/useRfq";
import { bigNumberToFloat } from "@/modules/omniston/demo/lib/utils";
import { useAssets } from "@/modules/omniston/demo/providers/assets";
import { useSwapForm, useSwapFormDispatch } from "@/modules/omniston/demo/providers/swap-form";
import { useTradeTrackState } from "@/modules/omniston/demo/providers/trade-track";

/**
 * Mirrors RFQ quote amounts into the To/From fields (without clearing the user-driven side).
 */
export const useSyncQuoteToSwapForm = (): void => {
  const swapForm = useSwapForm();
  const dispatch = useSwapFormDispatch();
  const { getAssetById } = useAssets();
  const { data: quoteEvent } = useRfq();
  const { quote: trackingQuote } = useTradeTrackState();

  const quote = quoteEvent?.$case === "quoteUpdated" ? quoteEvent.value : undefined;

  useEffect(() => {
    if (!quote || trackingQuote) {
      return;
    }

    const inputAsset = swapForm.inputAssetId ? getAssetById(swapForm.inputAssetId) : undefined;
    const outputAsset = swapForm.outputAssetId ? getAssetById(swapForm.outputAssetId) : undefined;

    if (!inputAsset || !outputAsset) {
      return;
    }

    if (swapForm.inputUnits) {
      const outputAmount = bigNumberToFloat(quote.outputUnits, outputAsset.metadata.decimals);

      if (outputAmount !== swapForm.outputUnits) {
        dispatch({ type: "SYNC_OUTPUT_FROM_QUOTE", payload: outputAmount });
      }

      return;
    }

    if (swapForm.outputUnits) {
      const inputAmount = bigNumberToFloat(quote.inputUnits, inputAsset.metadata.decimals);

      if (inputAmount !== swapForm.inputUnits) {
        dispatch({ type: "SYNC_INPUT_FROM_QUOTE", payload: inputAmount });
      }
    }
  }, [
    quote,
    quote?.quoteId,
    quote?.inputUnits,
    quote?.outputUnits,
    trackingQuote,
    swapForm.inputAssetId,
    swapForm.outputAssetId,
    swapForm.inputUnits,
    swapForm.outputUnits,
    getAssetById,
    dispatch,
  ]);
};
