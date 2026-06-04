"use client";

import type { Wallet } from "@tonconnect/sdk";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { apiClient } from "@/shared/infrastructure/api/client";

interface TonWalletSignInProps {
  callbackUrl?: string;
}

interface TonProofPayloadResponse {
  payload: string;
}

interface TonProofSignature {
  timestamp: number;
  domain: { lengthBytes: number; value: string };
  payload: string;
  signature: string;
}

const getTonProof = (connectedWallet: Wallet): TonProofSignature | null => {
  const tonProofItem = connectedWallet.connectItems?.tonProof;
  if (tonProofItem && "proof" in tonProofItem) {
    return tonProofItem.proof;
  }

  return null;
};

export const TonWalletSignIn = ({ callbackUrl = "/" }: TonWalletSignInProps) => {
  const router = useRouter();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticatingRef = useRef(false);
  const pendingSignInRef = useRef(false);

  const authenticateWallet = useCallback(
    async (connectedWallet: Wallet) => {
      if (isAuthenticatingRef.current) {
        return;
      }

      const proof = getTonProof(connectedWallet);
      if (!proof) {
        setError("Wallet did not return ton_proof");
        pendingSignInRef.current = false;
        return;
      }

      const publicKey = connectedWallet.account.publicKey;
      if (!publicKey) {
        setError("Wallet public key is missing");
        pendingSignInRef.current = false;
        return;
      }

      isAuthenticatingRef.current = true;
      setIsLoading(true);
      setError(null);

      const proofRequest = {
        address: connectedWallet.account.address,
        network: connectedWallet.account.chain,
        publicKey,
        walletStateInit: connectedWallet.account.walletStateInit,
        proof,
      };

      const result = await signIn("ton-connect", {
        proofRequest: JSON.stringify(proofRequest),
        redirect: false,
        callbackUrl,
      });

      isAuthenticatingRef.current = false;
      pendingSignInRef.current = false;
      setIsLoading(false);

      if (result?.error) {
        setError("TON proof verification failed");
        return;
      }

      if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    },
    [callbackUrl, router]
  );

  useEffect(() => {
    if (!wallet || !pendingSignInRef.current) {
      return;
    }

    void authenticateWallet(wallet);
  }, [wallet, authenticateWallet]);

  useEffect(() => {
    const unsubscribe = tonConnectUI.onModalStateChange(state => {
      if (state.status === "closed" && !wallet) {
        pendingSignInRef.current = false;
        tonConnectUI.setConnectRequestParameters(null);
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, [tonConnectUI, wallet]);

  const handleConnectWallet = async () => {
    setError(null);
    setIsLoading(true);
    pendingSignInRef.current = true;

    try {
      tonConnectUI.setConnectRequestParameters({ state: "loading" });

      const response = await apiClient<TonProofPayloadResponse>("/api/auth/ton-proof/payload");
      const payload = response.payload;

      if (!payload) {
        tonConnectUI.setConnectRequestParameters(null);
        setError("Failed to load ton_proof payload");
        pendingSignInRef.current = false;
        setIsLoading(false);
        return;
      }

      tonConnectUI.setConnectRequestParameters({
        state: "ready",
        value: { tonProof: payload },
      });

      await tonConnectUI.openModal();
    } catch {
      tonConnectUI.setConnectRequestParameters(null);
      setError("Failed to start wallet connection");
      pendingSignInRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Button
        type="button"
        className="w-full"
        onClick={() => void handleConnectWallet()}
        disabled={isLoading}
        aria-label="Sign in with TON wallet"
      >
        {isLoading ? "Connecting…" : "TON Wallet"}
      </Button>
      {error ? (
        <p className="text-destructive text-center text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
