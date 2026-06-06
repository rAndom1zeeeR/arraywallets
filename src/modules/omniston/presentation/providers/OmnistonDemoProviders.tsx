"use client";

import type { ReactNode } from "react";
import { AssetsProvider } from "@/modules/omniston/demo/providers/assets";
import { SwapFormProvider } from "@/modules/omniston/demo/providers/swap-form";
import { SwapSettingsProvider } from "@/modules/omniston/demo/providers/swap-settings";
import { TradeTrackProvider } from "@/modules/omniston/demo/providers/trade-track";
import { OmnistonModeProvider } from "@/modules/omniston/presentation/providers/OmnistonModeProvider";

interface OmnistonDemoProvidersProps {
  children: ReactNode;
}

/**
 * Cross-chain swap demo context (wagmi/AppKit + swap form + trade tracking).
 * Must be nested inside {@link OmnistonProviders} and app {@link AuthProvider}.
 */
export const OmnistonDemoProviders = ({ children }: OmnistonDemoProvidersProps) => {
  return (
    <AssetsProvider>
      <OmnistonModeProvider>
        <SwapSettingsProvider>
          <SwapFormProvider>
            <TradeTrackProvider>{children}</TradeTrackProvider>
          </SwapFormProvider>
        </SwapSettingsProvider>
      </OmnistonModeProvider>
    </AssetsProvider>
  );
};
