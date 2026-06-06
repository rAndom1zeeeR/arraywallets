"use client";

import type { ReactNode } from "react";

import { WalletConnectProvider } from "@/modules/omniston/demo/providers/wallet-connect";
import { OmnistonProviders } from "@/modules/omniston/presentation/providers/OmnistonProviders";
import { walletConnectProjectId } from "@/shared/config/env.public.config";

interface AppShellProvidersProps {
  children: ReactNode;
}

/**
 * App-wide providers: Omniston SDK + EVM wallet connect (Reown AppKit / wagmi).
 */
export const AppShellProviders = ({ children }: AppShellProvidersProps) => {
  return (
    <OmnistonProviders>
      <WalletConnectProvider projectId={walletConnectProjectId}>{children}</WalletConnectProvider>
    </OmnistonProviders>
  );
};
