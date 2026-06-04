"use client";

import type { Wallet } from "@tonconnect/sdk";
import { CHAIN, useTonConnectUI } from "@tonconnect/ui-react";
import { useRouter } from "next/navigation";
import { getSession, signIn, useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TON_CREDENTIALS_PROVIDER_ID } from "@/modules/auth/domain/ton-connect.constants";
import { TON_PROOF_PAYLOAD_REFRESH_MS } from "@/shared/config/ton-connect.config";
import { apiClient } from "@/shared/infrastructure/api/client";

interface TonProofPayloadResponse {
  payload: string;
}

interface TonAddressItemReplyFields {
  publicKey?: string;
  walletStateInit?: string;
}

interface ConnectItemsWithTonAddr {
  ton_addr?: TonAddressItemReplyFields;
}

interface UseTonWalletSignInOptions {
  callbackUrl?: string;
  initialTonProofPayload?: string | null;
}

let tonWalletAuthInProgress = false;

const mapSignInError = (code: string | undefined): string => {
  if (code === "CredentialsSignin") {
    return "TON proof verification failed";
  }

  if (code === "MissingSecret") {
    return "Auth is misconfigured (AUTH_SECRET missing)";
  }

  return code ? `Sign-in failed (${code})` : "Sign-in failed";
};

/**
 * TON Connect sign-in: ton_proof payload, modal, and NextAuth credentials flow.
 */
export const useTonWalletSignIn = ({
  callbackUrl = "/",
  initialTonProofPayload = null,
}: UseTonWalletSignInOptions = {}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [tonConnectUI] = useTonConnectUI();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialPayloadApplied = useRef(false);

  const setTonProofParams = useCallback(async () => {
    if (!tonConnectUI) {
      return;
    }

    tonConnectUI.setConnectRequestParameters({ state: "loading" });

    try {
      const response = await apiClient<TonProofPayloadResponse>("/api/auth/ton-proof/payload");
      const payload = response.payload;

      if (payload) {
        tonConnectUI.setConnectRequestParameters({
          state: "ready",
          value: { tonProof: payload },
        });
      } else {
        tonConnectUI.setConnectRequestParameters(null);
      }
    } catch {
      tonConnectUI.setConnectRequestParameters(null);
    }
  }, [tonConnectUI]);

  useEffect(() => {
    if (initialTonProofPayload && !initialPayloadApplied.current && tonConnectUI) {
      initialPayloadApplied.current = true;
      tonConnectUI.setConnectRequestParameters({
        state: "ready",
        value: { tonProof: initialTonProofPayload },
      });
    }

    void setTonProofParams();
    const intervalId = window.setInterval(() => {
      void setTonProofParams();
    }, TON_PROOF_PAYLOAD_REFRESH_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [setTonProofParams, initialTonProofPayload, tonConnectUI]);

  const handleTonConnectAuth = useCallback(
    async (wallet: Wallet) => {
      if (tonWalletAuthInProgress) {
        return;
      }

      const tonProof = wallet.connectItems?.tonProof;
      const connectItemsExt = wallet.connectItems as ConnectItemsWithTonAddr | undefined;
      const accountExt = wallet.account as TonAddressItemReplyFields;
      const publicKey = accountExt.publicKey ?? connectItemsExt?.ton_addr?.publicKey;
      const walletStateInit = accountExt.walletStateInit ?? connectItemsExt?.ton_addr?.walletStateInit;

      if (!tonProof || !("proof" in tonProof)) {
        try {
          if (tonConnectUI.connected) {
            await tonConnectUI.disconnect();
          }
        } catch {
          // bridge may already be closed
        }
        setError("Reconnect the wallet to sign in (ton_proof required)");
        return;
      }

      if (!publicKey || !walletStateInit) {
        setError("Wallet did not return publicKey or walletStateInit");
        return;
      }

      tonWalletAuthInProgress = true;
      setIsConnecting(true);
      setError(null);

      try {
        const network = wallet.account.chain === CHAIN.TESTNET ? "-3" : "-239";
        const result = await signIn(TON_CREDENTIALS_PROVIDER_ID, {
          address: wallet.account.address,
          proof: JSON.stringify(tonProof.proof),
          public_key: publicKey,
          wallet_state_init: walletStateInit,
          network,
          redirect: false,
          callbackUrl,
        });

        if (result?.error) {
          setError(mapSignInError(result.error));
          return;
        }

        if (result?.ok) {
          await new Promise(resolve => setTimeout(resolve, 150));
          await getSession();
          router.push(callbackUrl);
          router.refresh();
        }
      } finally {
        tonWalletAuthInProgress = false;
        setIsConnecting(false);
      }
    },
    [callbackUrl, router, tonConnectUI]
  );

  useEffect(() => {
    if (!tonConnectUI) {
      return;
    }

    const unsubscribe = tonConnectUI.onStatusChange(async wallet => {
      if (!wallet || session?.user) {
        return;
      }

      await handleTonConnectAuth(wallet);
    });

    return unsubscribe;
  }, [tonConnectUI, session?.user, handleTonConnectAuth]);

  const openTonConnectModal = useCallback(async () => {
    if (!tonConnectUI) {
      return;
    }

    setError(null);
    setIsConnecting(true);

    try {
      await setTonProofParams();
      if (tonConnectUI.connected) {
        await tonConnectUI.disconnect();
      }
      await tonConnectUI.openModal();
    } catch {
      setError("Failed to open wallet connection");
    } finally {
      setIsConnecting(false);
    }
  }, [setTonProofParams, tonConnectUI]);

  return {
    isConnecting,
    error,
    openTonConnectModal,
  };
};
