import { getAuthConfigError } from "@/shared/config/auth-env";

/**
 * Logs Auth.js misconfiguration at startup (e.g. missing AUTH_SECRET on Vercel).
 */
export function register() {
  const authError = getAuthConfigError();
  if (authError) {
    console.error(`[auth] ${authError}`);
  }
}
