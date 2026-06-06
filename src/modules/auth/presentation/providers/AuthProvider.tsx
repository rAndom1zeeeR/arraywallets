"use client";

import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { SessionRefresh } from "@/modules/auth/presentation/components/SessionRefresh";
import { TON_CONNECT_MANIFEST_URL } from "@/shared/config/ton-connect.config";

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * NextAuth session + TON Connect UI (same layout as ArrayTonV16 auth-provider).
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  console.log("TON_CONNECT_MANIFEST_URL", TON_CONNECT_MANIFEST_URL);
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <TonConnectUIProvider manifestUrl={TON_CONNECT_MANIFEST_URL} analytics={{ mode: "off" }}>
        <SessionRefresh />
        {children}
      </TonConnectUIProvider>
    </SessionProvider>
  );
};
