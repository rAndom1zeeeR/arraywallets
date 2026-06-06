"use client";

import { useTonWalletSignInContext } from "@/modules/auth/presentation/providers/TonWalletSignInProvider";
import { Button } from "@/shared/components/ui/button";

interface TonWalletSignInProps {
  callbackUrl?: string;
  initialTonProofPayload?: string | null;
}

/**
 * TON Connect sign-in (ArrayTonV16 auth-button flow, Next.js API routes).
 */
export const TonWalletSignIn = (_props: TonWalletSignInProps) => {
  const { isConnecting, error, openTonConnectModal } = useTonWalletSignInContext();

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Button
        type="button"
        className="w-full"
        onClick={() => void openTonConnectModal()}
        disabled={isConnecting}
        aria-label="Sign in with TON wallet"
      >
        {isConnecting ? "Connecting…" : "TON Wallet"}
      </Button>
      {error ? (
        <p className="text-destructive text-center text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
