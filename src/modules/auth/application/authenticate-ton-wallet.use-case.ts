import { consumeTonProofChallenge } from "@/modules/auth/infrastructure/ton-proof/ton-proof-challenge.service";
import { TonProofService } from "@/modules/auth/infrastructure/ton-proof/ton-proof.service";
import {
  tonConnectProofRequestSchema,
  type TonConnectProofRequest,
} from "@/modules/auth/infrastructure/ton-proof/ton-proof.schema";
import { resolveUserRole } from "@/modules/auth/domain/resolve-user-role";
import { prisma } from "@/shared/infrastructure/api/prisma";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";
import type { UserRole } from "@/shared/infrastructure/api/prisma-client";

const tonProofService = new TonProofService();

export interface AuthenticatedTonUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  walletAddress: string;
}

function parseProofRequest(raw: string): TonConnectProofRequest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = tonConnectProofRequestSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Verifies ton_proof and returns (or creates) the Auth.js user for the wallet.
 */
export async function authenticateTonWallet(
  proofRequestRaw: string
): Promise<AuthenticatedTonUser | null> {
  const proofRequest = parseProofRequest(proofRequestRaw);
  if (!proofRequest) {
    return null;
  }

  const isValidProof = await tonProofService.checkProof(proofRequest);
  if (!isValidProof) {
    return null;
  }

  const challengeValid = await consumeTonProofChallenge(proofRequest.proof.payload);
  if (!challengeValid) {
    return null;
  }

  const walletAddress = toRawTonAddress(proofRequest.address);
  const role = resolveUserRole(undefined, walletAddress);

  const existing = await prisma.user.findUnique({
    where: { walletAddress },
  });

  if (existing) {
    if (existing.role !== role) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role },
      });
    }

    await prisma.account.upsert({
      where: {
        provider_providerAccountId: {
          provider: "ton-connect",
          providerAccountId: walletAddress,
        },
      },
      update: { userId: existing.id },
      create: {
        userId: existing.id,
        type: "oauth",
        provider: "ton-connect",
        providerAccountId: walletAddress,
      },
    });

    return {
      id: existing.id,
      name: existing.name ?? walletAddress,
      email: existing.email,
      image: existing.image,
      role,
      walletAddress,
    };
  }

  const created = await prisma.user.create({
    data: {
      walletAddress,
      name: walletAddress,
      role,
    },
  });

  await prisma.account.create({
    data: {
      userId: created.id,
      type: "oauth",
      provider: "ton-connect",
      providerAccountId: walletAddress,
    },
  });

  return {
    id: created.id,
    name: created.name,
    email: created.email,
    image: created.image,
    role: created.role,
    walletAddress: created.walletAddress ?? walletAddress,
  };
}
