import { TON_CONNECT_ACCOUNT_PROVIDER } from "@/modules/auth/domain/ton-connect.constants";
import { resolveUserRole } from "@/modules/auth/domain/resolve-user-role";
import { consumeTonProofChallenge } from "@/modules/auth/infrastructure/ton-proof/ton-proof-challenge.service";
import { TonProofService } from "@/modules/auth/infrastructure/ton-proof/ton-proof.service";
import {
  tonConnectProofRequestSchema,
  type TonConnectProofRequest,
} from "@/modules/auth/infrastructure/ton-proof/ton-proof.schema";
import { prisma } from "@/shared/infrastructure/api/prisma";
import type { UserRole } from "@/shared/infrastructure/api/prisma-client";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";

const tonProofService = new TonProofService();

export interface AuthenticatedTonUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: UserRole;
  walletAddress: string;
}

/**
 * Verifies ton_proof and returns (or creates) the Auth.js user for the wallet.
 */
export async function authenticateTonWallet(
  input: TonConnectProofRequest
): Promise<AuthenticatedTonUser | null> {
  const proofRequest = tonConnectProofRequestSchema.safeParse(input);
  if (!proofRequest.success) {
    return null;
  }

  const request = proofRequest.data;

  const isValidProof = await tonProofService.checkProof(request);
  if (!isValidProof) {
    return null;
  }

  const challengeValid = await consumeTonProofChallenge(request.proof.payload);
  if (!challengeValid) {
    return null;
  }

  const walletAddress = toRawTonAddress(request.address);
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
          provider: TON_CONNECT_ACCOUNT_PROVIDER,
          providerAccountId: walletAddress,
        },
      },
      update: { userId: existing.id },
      create: {
        userId: existing.id,
        type: "oauth",
        provider: TON_CONNECT_ACCOUNT_PROVIDER,
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
      provider: TON_CONNECT_ACCOUNT_PROVIDER,
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
