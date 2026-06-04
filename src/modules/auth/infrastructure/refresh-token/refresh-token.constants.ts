export const AUTH_REFRESH_COOKIE = "auth-refresh";

const REFRESH_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_MAX_AGE_SECONDS,
  };
}

/** Access JWT lifetime (seconds). */
export const AUTH_ACCESS_MAX_AGE_SECONDS = 15 * 60;
