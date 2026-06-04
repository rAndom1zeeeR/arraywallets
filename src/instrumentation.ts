import { getAuthConfigError } from "@/shared/config/auth-env";

/**
 * Logs Auth.js misconfiguration at startup (e.g. missing AUTH_SECRET on Vercel).
 */
export function register() {
  const authError = getAuthConfigError();
  if (authError) {
    const log = process.env.NODE_ENV === "production" ? console.error : console.warn;
    log(`[auth] ${authError}`);
  }
}
