"use client";

import type { ReactNode } from "react";
import type { SwapFormState } from "@/modules/omniston/demo/lib/omniston/swap-form-mode.utils";
import { AssetsProvider } from "@/modules/omniston/demo/providers/assets";
import { SwapFormProvider } from "@/modules/omniston/demo/providers/swap-form";
import { SwapSettingsProvider } from "@/modules/omniston/demo/providers/swap-settings";
import { TradeTrackProvider } from "@/modules/omniston/demo/providers/trade-track";
import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";
import { OmnistonModeProvider } from "@/modules/omniston/presentation/providers/OmnistonModeProvider";

interface OmnistonDemoProvidersProps {
  children: ReactNode;
  initialMode?: OmnistonMode;
  swapFormInitialState?: SwapFormState;
  swapFormPersist?: boolean;
}

/**
 * Cross-chain swap demo context (wagmi/AppKit + swap form + trade tracking).
 * Must be nested inside {@link OmnistonProviders} and app {@link AuthProvider}.
 */
export const OmnistonDemoProviders = ({
  children,
  initialMode,
  swapFormInitialState,
  swapFormPersist,
}: OmnistonDemoProvidersProps) => {
  return (
    <AssetsProvider>
      <OmnistonModeProvider initialMode={initialMode}>
        <SwapSettingsProvider>
          <SwapFormProvider initialState={swapFormInitialState} persist={swapFormPersist}>
            <TradeTrackProvider>{children}</TradeTrackProvider>
          </SwapFormProvider>
        </SwapSettingsProvider>
      </OmnistonModeProvider>
    </AssetsProvider>
  );
};
