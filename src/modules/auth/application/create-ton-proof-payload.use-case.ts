import { createTonProofChallenge } from "@/modules/auth/infrastructure/ton-proof/ton-proof-challenge.service";

/**
 * Creates a one-time payload for TON Connect `ton_proof` request.
 */
export async function createTonProofPayload(): Promise<string> {
  return createTonProofChallenge();
}
