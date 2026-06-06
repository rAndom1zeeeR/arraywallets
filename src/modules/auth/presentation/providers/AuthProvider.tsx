"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { SessionRefresh } from "@/modules/auth/presentation/components/SessionRefresh";
import { TonWalletSignInProvider } from "@/modules/auth/presentation/providers/TonWalletSignInProvider";
import { TON_CONNECT_MANIFEST_URL } from "@/shared/config/ton-connect.config";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * NextAuth session + TON Connect UI (same layout as ArrayTonV16 auth-provider).
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <TonConnectUIProvider manifestUrl={TON_CONNECT_MANIFEST_URL} analytics={{ mode: "off" }}>
        <TonWalletSignInProvider>
          <SessionRefresh />
          {children}
        </TonWalletSignInProvider>
      </TonConnectUIProvider>
    </SessionProvider>
  );
};
