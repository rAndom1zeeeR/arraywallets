"use client";

import { useTonWallet } from "@tonconnect/ui-react";
import { CircleX } from "lucide-react";
import { useCallback, useState } from "react";
import { useTonWalletConnect } from "@/modules/auth/presentation/hooks/use-ton-wallet-connect";
import { matchQuoteByType } from "@ston-fi/omniston-sdk-react";

import { cn } from "@/modules/omniston/demo/lib/utils";
import { Button, type ButtonProps } from "@/modules/omniston/demo/components/ui/button";
import { Spinner } from "@/modules/omniston/demo/components/ui/spinner";
import { useTonTransaction } from "@/modules/omniston/demo/hooks/useTonTransaction";
import { useRfq } from "@/modules/omniston/demo/hooks/useRfq";
import { useTradeTrackState } from "@/modules/omniston/demo/providers/trade-track";
import { useQuoteWallets } from "@/modules/omniston/demo/hooks/useTraderQuoteWallets";
import { CopyJsonCard } from "@/modules/omniston/demo/components/ui/copy-json-card";
import {
  isTonTransactionCancelledError,
  TON_TRANSACTION_CANCELLED_MESSAGE,
} from "@/shared/lib/ton-connect-errors";

interface QuoteBuildErrorState {
  message: string;
  isCancellation: boolean;
  error?: Error;
}

const _QuoteActionTon = (props: Omit<ButtonProps, "children">) => {
  const [isClicked, setIsClicked] = useState(false);
  const [buildError, setBuildError] = useState<QuoteBuildErrorState | null>(null);

  const buildAndSendTransaction = useTonTransaction();
  const { startTradeTrack } = useTradeTrackState();

  const { data: quoteEvent } = useRfq();
  const quote = quoteEvent?.$case === "quoteUpdated" ? quoteEvent.value : undefined;

  const { inputWalletAddress } = useQuoteWallets(quote);

  const handleQuoteClick = useCallback(async () => {
    if (!quote || !buildAndSendTransaction || !inputWalletAddress) {
      return;
    }

    try {
      setIsClicked(true);
      setBuildError(null);

      const { signedBoc, htlcSecrets } = await buildAndSendTransaction();

      matchQuoteByType(quote, {
        swap: async (swapQuote) => {
          await startTradeTrack({
            quote: swapQuote,
            trackTradeData: {
              quoteId: swapQuote.quoteId,
              traderAddress: inputWalletAddress,
              outgoingTxQuery: signedBoc,
            },
          });
        },
        order: async (orderQuote) => {
          await startTradeTrack({
            quote: orderQuote,
            htlcSecrets,
            trackTradeData: {
              quoteId: orderQuote.quoteId,
              traderAddress: inputWalletAddress,
            },
          });
        },
      });

      setBuildError(null);
    } catch (error) {
      if (isTonTransactionCancelledError(error)) {
        setBuildError({
          message: TON_TRANSACTION_CANCELLED_MESSAGE,
          isCancellation: true,
        });
      } else {
        const nextError =
          error instanceof Error ? error : new Error("Unknown error", { cause: error });
        setBuildError({
          message: nextError.message,
          isCancellation: false,
          error: nextError,
        });
      }
    } finally {
      setIsClicked(false);
    }
  }, [quote, inputWalletAddress, buildAndSendTransaction, startTradeTrack]);

  return (
    <div className="flex flex-col">
      <Button
        {...props}
        className={cn("relative z-10", props.className)}
        disabled={isClicked || !handleQuoteClick || props.disabled || !quote || !inputWalletAddress}
        onClick={handleQuoteClick}
      >
        {isClicked ? <Spinner /> : "Accept quote"}
      </Button>

      {buildError?.isCancellation && (
        <div
          role="alert"
          className="animate-in slide-in-from-top-2 fade-in -mt-2 flex items-center justify-center gap-2 rounded-b-md border border-t-0 border-red-500/40 bg-gradient-to-b from-red-500/20 to-red-500/10 px-3 py-2.5 pt-3 duration-200"
        >
          <CircleX className="size-4 shrink-0 text-red-500" aria-hidden />
          <p className="text-sm font-medium text-red-500">{buildError.message}</p>
        </div>
      )}

      {buildError && !buildError.isCancellation && buildError.error && (
        <div className="animate-in slide-in-from-top-2 fade-in -mt-2 duration-200">
          <CopyJsonCard
            title={<span className="m-0 truncate text-red-500">{buildError.message}</span>}
            value={buildError.error}
            className="rounded-t-none border-t-0 border-red-500/30 bg-gradient-to-b from-red-500/10 to-red-500/5 pt-2"
          >
            <pre className="mt-1 overflow-x-auto text-xs break-words whitespace-pre-wrap text-red-500 opacity-70">
              {buildError.error.stack}
            </pre>
          </CopyJsonCard>
        </div>
      )}
    </div>
  );
};

function withTonWalletGuard(Component: React.ComponentType<ButtonProps>) {
  return function TonWalletGuardedButton(props: ButtonProps) {
    const wallet = useTonWallet();
    const { openModal } = useTonWalletConnect();

    if (!wallet) {
      return (
        <Button
          {...props}
          onClick={(event) => {
            void openModal();
            props.onClick?.(event);
          }}
        >
          Connect Wallet
        </Button>
      );
    }

    return <Component {...props} />;
  };
}

export const QuoteActionTon = withTonWalletGuard(_QuoteActionTon);
