import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { rotateAuthRefresh } from "@/modules/auth/application/rotate-auth-refresh.use-case";
import {
  AUTH_REFRESH_COOKIE,
  getRefreshCookieOptions,
} from "@/modules/auth/infrastructure/refresh-token/refresh-token.constants";

/**
 * Rotates the httpOnly refresh token. Client should call `session.update()` after success.
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(AUTH_REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 401 });
  }

  const rotated = await rotateAuthRefresh(refreshToken);

  if (!rotated) {
    cookieStore.delete(AUTH_REFRESH_COOKIE);
    return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
  }

  cookieStore.set(AUTH_REFRESH_COOKIE, rotated.token, getRefreshCookieOptions());

  return NextResponse.json({ ok: true });
}
