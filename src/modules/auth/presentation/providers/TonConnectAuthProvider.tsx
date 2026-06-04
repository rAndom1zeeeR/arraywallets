"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";
import type { ReactNode } from "react";

interface TonConnectAuthProviderProps {
  children: ReactNode;
}

/**
 * TON Connect UI context for wallet connection and ton_proof sign-in.
 */
export const TonConnectAuthProvider = ({ children }: TonConnectAuthProviderProps) => {
  const manifestUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/tonconnect-manifest.json`
      : "https://wallets.arrayton.com/tonconnect-manifest.json";

  return (
    <TonConnectUIProvider manifestUrl={manifestUrl} restoreConnection={false}>
      {children}
    </TonConnectUIProvider>
  );
};
