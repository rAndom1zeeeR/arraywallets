"use client";

import { ArrowLeftRight, Settings } from "lucide-react";
import { useMemo, useState } from "react";

import { ConnectionStatus } from "@/modules/omniston/demo/components/ConnectionStatus";
import { QuoteAction } from "@/modules/omniston/demo/components/QuoteAction";
import { QuotePreview } from "@/modules/omniston/demo/components/QuotePreview";
import { QuoteRefreshButton } from "@/modules/omniston/demo/components/QuoteRefreshButton";
import { QuoteTrackTrade } from "@/modules/omniston/demo/components/QuoteTrackTrade";
import { SwapForm } from "@/modules/omniston/demo/components/SwapForm";
import { SwapSettings } from "@/modules/omniston/demo/components/SwapSettings";
import { Button } from "@/modules/omniston/demo/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/modules/omniston/demo/components/ui/dialog";
import { buildJettonToTonSwapFormState } from "@/modules/omniston/demo/lib/omniston/swap-form-mode.utils";
import { OmnistonAuthActions } from "@/modules/omniston/presentation/components/OmnistonAuthActions";
import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";
import { OmnistonDemoProviders } from "@/modules/omniston/presentation/providers/OmnistonDemoProviders";
import { cn } from "@/shared/lib/utils";

interface WalletJettonTradeDialogProps {
  jettonAddress: string;
  jettonSymbol: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WalletJettonTradeSwapPanel = ({
  jettonAddress,
}: Pick<WalletJettonTradeDialogProps, "jettonAddress">) => {
  const swapFormInitialState = useMemo(
    () => buildJettonToTonSwapFormState(jettonAddress),
    [jettonAddress],
  );

  return (
    <OmnistonDemoProviders
      initialMode={OmnistonMode.SWAP}
      swapFormInitialState={swapFormInitialState}
      swapFormPersist={false}
    >
      <div className="flex w-full min-w-0 flex-col gap-3 sm:gap-4">
        <OmnistonAuthActions showEvmWallet={false} />

        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-medium leading-8 text-foreground sm:text-xl">Swap</h2>

          <div className="flex items-center justify-end gap-1.5 sm:gap-2">
            <ConnectionStatus />
            <QuoteRefreshButton />
            <SwapSettings
              trigger={
                <Button
                  variant="outline"
                  className="size-8 shrink-0 p-0 data-[state=open]:border-foreground/50"
                >
                  <Settings size={16} aria-hidden />
                  <span className="sr-only">Swap settings</span>
                </Button>
              }
            />
          </div>
        </div>

        <SwapForm hideModeTabs />
        <QuoteAction className="w-full" />
        <QuotePreview className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200" />
        <QuoteTrackTrade className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200" />
      </div>
    </OmnistonDemoProviders>
  );
};

export const WalletJettonTradeDialog = ({
  jettonAddress,
  jettonSymbol,
  open,
  onOpenChange,
}: WalletJettonTradeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex w-[calc(100%-2rem)] max-w-[500px] flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl",
          "max-h-[min(90vh,900px)]",
        )}
      >
        <DialogHeader className="shrink-0 space-y-1 border-b border-border/50 px-4 py-4 pr-12 text-left sm:px-5">
          <DialogTitle className="text-lg font-semibold leading-tight sm:text-xl">
            {jettonSymbol} → TON
          </DialogTitle>
          <DialogDescription>Swap via Omniston</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5">
          {open ? (
            <WalletJettonTradeSwapPanel key={jettonAddress} jettonAddress={jettonAddress} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface WalletJettonTradeButtonProps {
  jettonAddress: string;
  jettonSymbol: string;
}

export const WalletJettonTradeButton = ({
  jettonAddress,
  jettonSymbol,
}: WalletJettonTradeButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`Trade ${jettonSymbol}`}
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2",
          "bg-sky-500 text-sm font-semibold text-white shadow-sm shadow-sky-500/30",
          "transition-all hover:bg-sky-600 hover:shadow-md hover:shadow-sky-500/35",
          "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "dark:bg-sky-600 dark:hover:bg-sky-500",
        )}
      >
        <ArrowLeftRight className="size-3.5 shrink-0" aria-hidden />
        <span>Trade</span>
      </button>

      <WalletJettonTradeDialog
        jettonAddress={jettonAddress}
        jettonSymbol={jettonSymbol}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
};
