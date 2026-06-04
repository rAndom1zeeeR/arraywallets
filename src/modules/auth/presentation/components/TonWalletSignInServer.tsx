import { createTonProofPayload } from "@/modules/auth/application/create-ton-proof-payload.use-case";
import { TonWalletSignIn } from "@/modules/auth/presentation/components/TonWalletSignIn";

interface TonWalletSignInServerProps {
  callbackUrl?: string;
}

/**
 * Prefetches ton_proof payload on the server (ArrayTonV16 auth-button-server pattern).
 */
export const TonWalletSignInServer = async ({ callbackUrl = "/" }: TonWalletSignInServerProps) => {
  let initialTonProofPayload: string | null = null;

  try {
    initialTonProofPayload = await createTonProofPayload();
  } catch {
    initialTonProofPayload = null;
  }

  return (
    <TonWalletSignIn callbackUrl={callbackUrl} initialTonProofPayload={initialTonProofPayload} />
  );
};
