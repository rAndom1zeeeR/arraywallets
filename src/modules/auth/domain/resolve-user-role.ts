import type { UserRole } from "@/shared/infrastructure/api/prisma-client";
import { getAuthAdminEmails, getAuthAdminWallets } from "@/shared/config/auth.config";
import { toRawTonAddress, tryToRawTonAddress } from "@/shared/lib/ton/ton-address";

/**
 * Resolves application role from email and/or wallet (admin allowlists or default USER).
 */
export function resolveUserRole(
  email?: string | null,
  walletAddress?: string | null
): UserRole {
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    if (getAuthAdminEmails().includes(normalizedEmail)) {
      return "ADMIN";
    }
  }

  if (walletAddress) {
    const raw = tryToRawTonAddress(walletAddress) ?? toRawTonAddress(walletAddress);
    if (getAuthAdminWallets().includes(raw)) {
      return "ADMIN";
    }
  }

  return "USER";
}
