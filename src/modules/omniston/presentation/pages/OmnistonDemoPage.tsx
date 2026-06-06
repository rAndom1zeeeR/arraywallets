"use client";

import { TonConnectButton } from "@tonconnect/ui-react";
import { EvmWalletButton } from "@/modules/omniston/demo/components/EvmWalletButton";
import { isWalletConnectConfigured } from "@/shared/config/env.public.config";
import { Settings } from "lucide-react";
import { ActiveOrderList } from "@/modules/omniston/demo/components/ActiveOrderList";
import { ConnectionStatus } from "@/modules/omniston/demo/components/ConnectionStatus";
import { QuoteAction } from "@/modules/omniston/demo/components/QuoteAction";
import { QuotePreview } from "@/modules/omniston/demo/components/QuotePreview";
import { QuoteTrackTrade } from "@/modules/omniston/demo/components/QuoteTrackTrade";
import { SwapForm } from "@/modules/omniston/demo/components/SwapForm";
import { SwapSettings } from "@/modules/omniston/demo/components/SwapSettings";
import { Button } from "@/modules/omniston/demo/components/ui/button";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

/**
 * Cross-chain Omniston swap page — layout aligned with https://omniston.ston.fi/
 */
export const OmnistonDemoPage = () => {
  return (
    <div className={cn(explorerStyles.page, "px-4 py-6 sm:px-8")}>
      <div className="mx-auto flex w-full max-w-[500px] flex-col gap-4 pt-4 md:pt-8">
        {!isWalletConnectConfigured ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
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

        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-border pb-4">
          <EvmWalletButton />
          <TonConnectButton />
        </div>

        <div className="flex items-center gap-2">
          <h1 className="mr-auto text-xl font-medium leading-8">Swap</h1>
          <ConnectionStatus />
          <SwapSettings
            trigger={
              <Button variant="outline" className="size-8 p-0 data-[state=open]:border-foreground/50">
                <Settings size={16} aria-hidden />
                <span className="sr-only">Swap settings</span>
              </Button>
            }
          />
        </div>

        <SwapForm />
        <QuotePreview className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200" />
        <QuoteAction className="w-full" />
        <QuoteTrackTrade className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200" />
        <ActiveOrderList className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200" />
      </div>
    </div>
  );
};
