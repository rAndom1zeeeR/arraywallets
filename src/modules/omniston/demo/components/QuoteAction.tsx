"use client";

import { UnplugIcon } from "lucide-react";

import { Button } from "@/modules/omniston/demo/components/ui/button";
import { QuoteActionConnectWallet } from "@/modules/omniston/demo/components/QuoteActionConnectWallet";
import { QuoteActionTon } from "@/modules/omniston/demo/components/QuoteActionTon";
import { QuoteActionEvm } from "./QuoteActionEvm";
import { Spinner } from "@/modules/omniston/demo/components/ui/spinner";
import { useRfq } from "@/modules/omniston/demo/hooks/useRfq";
import { useTradeTrackState } from "@/modules/omniston/demo/providers/trade-track";
import { isAmountExceedingAssetBalance } from "@/modules/omniston/demo/lib/omniston/swap-exchange.utils";
import { bigNumberToFloat } from "@/modules/omniston/demo/lib/utils";
import { useAssets } from "@/modules/omniston/demo/providers/assets";
import { useSwapForm } from "@/modules/omniston/demo/providers/swap-form";
import { Chain, isEvmChain } from "@/modules/omniston/demo/models/chain";
import { useQuoteWallets } from "@/modules/omniston/demo/hooks/useTraderQuoteWallets";
import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";
import { useOmnistonMode } from "@/modules/omniston/presentation/providers/OmnistonModeProvider";

export const QuoteAction = (props: { className?: string }) => {
  const { mode } = useOmnistonMode();
  const swapForm = useSwapForm();
  const { getAssetById } = useAssets();

  const { data: quoteEvent } = useRfq();
  const quote = quoteEvent?.$case === "quoteUpdated" ? quoteEvent.value : undefined;

  const { quote: trackingQuote } = useTradeTrackState();

  const { inputWalletAddress, outputWalletAddress } = useQuoteWallets(quote);

  if (trackingQuote) return null;

  // swap form validations
  if (!swapForm.inputAssetId) {
    return <QuoteActionButton disabled>Select send asset</QuoteActionButton>;
  } else if (!swapForm.outputAssetId) {
    return <QuoteActionButton disabled>Select receive asset</QuoteActionButton>;
  } else if (!swapForm.inputUnits && !swapForm.outputUnits) {
    return <QuoteActionButton disabled>Enter an amount</QuoteActionButton>;
  } else if (swapForm.inputUnits === "0" || swapForm.outputUnits === "0") {
    return <QuoteActionButton disabled>Amount must be greater than 0</QuoteActionButton>;
  }

  const inputAsset = swapForm.inputAssetId ? getAssetById(swapForm.inputAssetId) : undefined;
  const inputUnitsForBalanceCheck =
    swapForm.inputUnits ||
    (swapForm.outputUnits && quote && inputAsset
      ? bigNumberToFloat(quote.inputUnits, inputAsset.metadata.decimals)
      : "");

  if (
    inputAsset &&
    inputUnitsForBalanceCheck &&
    isAmountExceedingAssetBalance(inputUnitsForBalanceCheck, inputAsset)
  ) {
    return <QuoteActionButton disabled>Insufficient balance</QuoteActionButton>;
  }

  // different quote events statuses
  else if (quoteEvent?.$case === "unsubscribed") {
    return (
      <QuoteActionButton disabled>
        <UnplugIcon size={16} className="mr-2" />
        <span>Unsubscribed.</span>
      </QuoteActionButton>
    );
  } else if (quoteEvent?.$case === "noQuote") {
    return (
      <QuoteActionButton disabled className="h-auto min-h-9 whitespace-normal py-2">
        <span>No route found for this pair. Try another asset, amount, or settlement method.</span>
      </QuoteActionButton>
    );
  } else if (!quote) {
    return (
      <QuoteActionButton disabled>
        <Spinner className="mr-2" />
        <span>Waiting for a quote…</span>
      </QuoteActionButton>
    );
  }
  // wallets for known quote validations
  else if (!inputWalletAddress) {
    const inputChain = quote.inputAsset.chain.$case as Chain;

    return <QuoteActionConnectWallet chain={inputChain} className={props.className} />;
  } else if (mode === OmnistonMode.TRANSFER && !outputWalletAddress) {
    const outputChain = quote.outputAsset.chain.$case as Chain;

    return <QuoteActionConnectWallet chain={outputChain} className={props.className} />;
  }
  // action buttons for known quote
  else if (quote.inputAsset.chain.$case === Chain.TON) {
    return <QuoteActionTon {...props} />;
  } else if (isEvmChain(quote.inputAsset.chain.$case)) {
    return <QuoteActionEvm {...props} />;
  }
};

function QuoteActionButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button {...props} variant="secondary">
      {props.children}
    </Button>
  );
}
