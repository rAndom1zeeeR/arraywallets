"use client";

import { useTonAddress, useTonConnectUI } from "@tonconnect/ui-react";
import { useCallback } from "react";

import { useTonWalletSignInContext } from "@/modules/auth/presentation/providers/TonWalletSignInProvider";

/**
 * TON wallet state + unified connect (TonConnect + NextAuth sign-in).
 */
export const useTonWalletConnect = () => {
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();
  const { openTonConnectModal } = useTonWalletSignInContext();

  const disconnect = useCallback(async () => {
    if (!tonConnectUI?.connected) {
      return;
    }

    await tonConnectUI.disconnect();
  }, [tonConnectUI]);

  return {
    address: address || undefined,
    isConnected: Boolean(address),
    openModal: openTonConnectModal,
    disconnect,
  };
};
