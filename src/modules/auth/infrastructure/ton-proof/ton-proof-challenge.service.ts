import { TonProofService } from "@/modules/auth/infrastructure/ton-proof/ton-proof.service";
import { prisma } from "@/shared/infrastructure/api/prisma";

const CHALLENGE_TTL_MS = 15 * 60 * 1000;

const tonProofService = new TonProofService();

/**
 * Creates a one-time ton_proof payload stored server-side.
 */
export async function createTonProofChallenge(): Promise<string> {
  const payload = await tonProofService.generatePayload();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await prisma.tonProofChallenge.create({
    data: { payload, expiresAt },
  });

  return payload;
}

/**
 * Marks challenge as used after successful verification.
 */
export async function consumeTonProofChallenge(payload: string): Promise<boolean> {
  const challenge = await prisma.tonProofChallenge.findUnique({
    where: { payload },
  });

  if (!challenge || challenge.usedAt || challenge.expiresAt < new Date()) {
    return false;
  }

  await prisma.tonProofChallenge.update({
    where: { id: challenge.id },
    data: { usedAt: new Date() },
  });

  return true;
}
