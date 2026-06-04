import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/shared/infrastructure/api/prisma";

const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface IssuedRefreshToken {
  token: string;
  familyId: string;
  expiresAt: Date;
}

/**
 * Issues a new refresh token (new rotation family).
 */
export async function issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
  const token = randomBytes(32).toString("base64url");
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.authRefreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(token),
      familyId,
      expiresAt,
    },
  });

  return { token, familyId, expiresAt };
}

/**
 * Rotates refresh token: revokes the old one and issues a new token in the same family.
 */
export async function rotateRefreshToken(
  refreshToken: string
): Promise<IssuedRefreshToken | null> {
  const tokenHash = hashRefreshToken(refreshToken);
  const existing = await prisma.authRefreshToken.findUnique({
    where: { tokenHash },
  });

  if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
    if (existing) {
      await revokeRefreshTokenFamily(existing.familyId);
    }
    return null;
  }

  await prisma.authRefreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  await prisma.authRefreshToken.create({
    data: {
      userId: existing.userId,
      tokenHash: hashRefreshToken(token),
      familyId: existing.familyId,
      expiresAt,
    },
  });

  return { token, familyId: existing.familyId, expiresAt };
}

/** Revokes all refresh tokens in a rotation family (reuse detection). */
export async function revokeRefreshTokenFamily(familyId: string): Promise<void> {
  await prisma.authRefreshToken.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes a single refresh token by raw value. */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(refreshToken);
  await prisma.authRefreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revokes all active refresh tokens for a user (new sign-in). */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.authRefreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
