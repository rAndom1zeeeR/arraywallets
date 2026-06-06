"use client";

import { Settings } from "lucide-react";

import { ActiveOrderList } from "@/modules/omniston/demo/components/ActiveOrderList";
import { ConnectionStatus } from "@/modules/omniston/demo/components/ConnectionStatus";
import { QuoteAction } from "@/modules/omniston/demo/components/QuoteAction";
import { QuoteRefreshButton } from "@/modules/omniston/demo/components/QuoteRefreshButton";
import { QuotePreview } from "@/modules/omniston/demo/components/QuotePreview";
import { QuoteTrackTrade } from "@/modules/omniston/demo/components/QuoteTrackTrade";
import { SwapForm } from "@/modules/omniston/demo/components/SwapForm";
import { SwapSettings } from "@/modules/omniston/demo/components/SwapSettings";
import { Button } from "@/modules/omniston/demo/components/ui/button";
import { OmnistonAuthActions } from "@/modules/omniston/presentation/components/OmnistonAuthActions";
import { OmnistonSupportedAssetsNotice } from "@/modules/omniston/presentation/components/OmnistonSupportedAssetsNotice";
import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";
import { useOmnistonMode } from "@/modules/omniston/presentation/providers/OmnistonModeProvider";
import { isWalletConnectConfigured } from "@/shared/config/env.public.config";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

/**
 * Omniston exchange — Transfer (cross-chain) + Swap (TON only).
 */
export const OmnistonDemoPage = () => {
  const { mode } = useOmnistonMode();
  const isTransferMode = mode === OmnistonMode.TRANSFER;
  const pageTitle = isTransferMode ? "Transfer" : "Swap";

  return (
    <div className={cn(explorerStyles.page, "px-3 py-4 sm:px-8 sm:py-6")}>
      <div className="mx-auto flex w-full max-w-[500px] flex-col gap-3 pt-1 sm:gap-4 sm:pt-4 md:pt-8">
        {isTransferMode && !isWalletConnectConfigured ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 sm:text-sm dark:text-amber-200">
            EVM connect requires{" "}
            <code className="text-xs">NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID</code> — create a
            project at{" "}
            <a
              href="https://cloud.reown.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              cloud.reown.com
            </a>
            .
          </p>
        ) : null}

        <OmnistonAuthActions showEvmWallet={isTransferMode} />

        <div className="flex items-center justify-between gap-2">
          <h1 className="hidden text-xl font-medium leading-8 sm:block">{pageTitle}</h1>

          <div className="flex w-full items-center justify-end gap-1.5 sm:ml-auto sm:w-auto sm:gap-2">
            <ConnectionStatus />
            <QuoteRefreshButton />
            <SwapSettings
              trigger={
                <Button
                  variant="outline"
                  className="size-8 shrink-0 p-0 data-[state=open]:border-foreground/50"
                >
                  <Settings size={16} aria-hidden />
                  <span className="sr-only">
                    {isTransferMode ? "Transfer settings" : "Swap settings"}
                  </span>
                </Button>
              }
            />
          </div>
        </div>

        <SwapForm />
        <QuoteAction className="w-full" />
        <QuotePreview className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200" />
        {isTransferMode ? <OmnistonSupportedAssetsNotice /> : null}
        <QuoteTrackTrade className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200" />
        {isTransferMode ? (
          <ActiveOrderList className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200" />
        ) : null}
      </div>
    </div>
  );
};
