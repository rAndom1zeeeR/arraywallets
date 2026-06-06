"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  useTonWalletSignIn,
  type UseTonWalletSignInResult,
} from "@/modules/auth/presentation/hooks/use-ton-wallet-sign-in";

const TonWalletSignInContext = createContext<UseTonWalletSignInResult | null>(null);

interface TonWalletSignInProviderProps {
  children: ReactNode;
}

const resolveCallbackUrl = (pathname: string | null): string => {
  if (pathname && pathname !== "/sign-in") {
    return pathname;
  }

  if (typeof window !== "undefined" && pathname === "/sign-in") {
    const fromQuery = new URLSearchParams(window.location.search).get("callbackUrl");

    if (fromQuery?.startsWith("/")) {
      return fromQuery;
    }
  }

  return "/";
};

/**
 * Single app-wide TON sign-in listener so auth from Omniston (or any route) updates the header session.
 */
export const TonWalletSignInProvider = ({ children }: TonWalletSignInProviderProps) => {
  const pathname = usePathname();
  const [callbackUrl, setCallbackUrl] = useState(() => resolveCallbackUrl(pathname));

  useEffect(() => {
    setCallbackUrl(resolveCallbackUrl(pathname));
  }, [pathname]);

  const signIn = useTonWalletSignIn({ callbackUrl });

  return (
    <TonWalletSignInContext.Provider value={signIn}>{children}</TonWalletSignInContext.Provider>
  );
};

export const useTonWalletSignInContext = (): UseTonWalletSignInResult => {
  const context = useContext(TonWalletSignInContext);

  if (!context) {
    throw new Error("useTonWalletSignInContext must be used within TonWalletSignInProvider");
  }

  return context;
};
