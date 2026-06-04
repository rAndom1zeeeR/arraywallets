import type { IssuedRefreshToken } from "@/modules/auth/infrastructure/refresh-token/refresh-token.service";
import { rotateRefreshToken } from "@/modules/auth/infrastructure/refresh-token/refresh-token.service";

/**
 * Rotates refresh token; returns null when invalid (possible reuse).
 */
export function rotateAuthRefresh(refreshToken: string): Promise<IssuedRefreshToken | null> {
  return rotateRefreshToken(refreshToken);
}
