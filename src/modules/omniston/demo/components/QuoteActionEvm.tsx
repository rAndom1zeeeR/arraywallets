"use client";

import { useAppKit } from "@reown/appkit/react";
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

const _QuoteActionEvm = (props: Omit<ButtonProps, "children">) => {
  const [isClicked, setIsClicked] = useState(false);
  const [buildError, setBuildError] = useState<Error | null>(null);

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
      setBuildError(error instanceof Error ? error : new Error("Unknown error", { cause: error }));
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

      {buildError && (
        <div className="animate-in slide-in-from-top-2 fade-in mt-2 duration-200">
          <CopyJsonCard
            title={<span className="m-0 truncate text-red-500">{buildError.message}</span>}
            value={buildError}
            className="border-red-500/30 bg-gradient-to-b from-red-500/10 to-red-500/5"
          >
            <pre className="mt-1 overflow-x-auto text-xs break-words whitespace-pre-wrap text-red-500 opacity-70">
              {buildError.stack}
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
