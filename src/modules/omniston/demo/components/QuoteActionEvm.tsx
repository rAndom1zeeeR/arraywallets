"use client";

import { useAppKit } from "@reown/appkit/react";
import { CircleX } from "lucide-react";
import { useCallback, useState, type ComponentType } from "react";
import { isWalletConnectConfigured } from "@/shared/config/env.public.config";
import { matchQuoteByType } from "@ston-fi/omniston-sdk-react";

import { Button, type ButtonProps } from "@/modules/omniston/demo/components/ui/button";
import { Spinner } from "@/modules/omniston/demo/components/ui/spinner";
import { useConnectedWallets } from "@/modules/omniston/demo/hooks/useConnectedWallets";
import { useEvmTransaction } from "@/modules/omniston/demo/hooks/useEvmTransaction";
import { useRfq } from "@/modules/omniston/demo/hooks/useRfq";
import { useQuoteWallets } from "@/modules/omniston/demo/hooks/useTraderQuoteWallets";
import { cn } from "@/modules/omniston/demo/lib/utils";
import { EVM_CHAINS } from "@/modules/omniston/demo/models/chain";
import { useTradeTrackState } from "@/modules/omniston/demo/providers/trade-track";
import { CopyJsonCard } from "@/modules/omniston/demo/components/ui/copy-json-card";
import {
  isEvmTransactionCancelledError,
  TRANSACTION_CANCELLED_MESSAGE,
} from "@/shared/lib/ton-connect-errors";

interface QuoteBuildErrorState {
  message: string;
  isCancellation: boolean;
  error?: Error;
}

const _QuoteActionEvm = (props: Omit<ButtonProps, "children">) => {
  const [isClicked, setIsClicked] = useState(false);
  const [buildError, setBuildError] = useState<QuoteBuildErrorState | null>(null);

  const buildAndSendTransaction = useEvmTransaction();
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

      const { htlcSecrets } = await buildAndSendTransaction();

      matchQuoteByType(quote, {
        swap: async () => {
          throw new Error("Swap quotes are not supported on EVM chains yet");
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
      if (isEvmTransactionCancelledError(error)) {
        setBuildError({
          message: TRANSACTION_CANCELLED_MESSAGE,
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
          className="animate-in slide-in-from-top-2 fade-in mt-2 flex items-center justify-center gap-2 rounded-md border border-red-500/40 bg-gradient-to-b from-red-500/20 to-red-500/10 px-3 py-2.5 duration-200"
        >
          <CircleX className="size-4 shrink-0 text-red-500" aria-hidden />
          <p className="text-sm font-medium text-red-500">{buildError.message}</p>
        </div>
      )}

      {buildError && !buildError.isCancellation && buildError.error && (
        <div className="animate-in slide-in-from-top-2 fade-in mt-2 duration-200">
          <CopyJsonCard
            title={<span className="m-0 truncate text-red-500">{buildError.message}</span>}
            value={buildError.error}
            className="border-red-500/30 bg-gradient-to-b from-red-500/10 to-red-500/5"
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

function withEvmWalletGuard(Component: ComponentType<Omit<ButtonProps, "children">>) {
  const GuardedWithAppKit = (props: Omit<ButtonProps, "children">) => {
    const { open: openAppKit } = useAppKit();
    const connectedWallets = useConnectedWallets();

    if (EVM_CHAINS.some((chain) => !connectedWallets[chain])) {
      return (
        <Button
          {...props}
          onClick={(e) => {
            openAppKit({ view: "Connect" });
            props.onClick?.(e);
          }}
        >
          Connect wallet
        </Button>
      );
    }

    return <Component {...props} />;
  };

  return (props: Omit<ButtonProps, "children">) => {
    if (!isWalletConnectConfigured) {
      return (
        <Button {...props} disabled>
          Configure EVM wallet connect
        </Button>
      );
    }

    return <GuardedWithAppKit {...props} />;
  };
}

export const QuoteActionEvm = withEvmWalletGuard(_QuoteActionEvm);
