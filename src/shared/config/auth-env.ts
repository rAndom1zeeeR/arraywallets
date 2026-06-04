/**
 * Auth.js required environment (server-only).
 */

const DEV_AUTH_SECRET_FALLBACK = "dev-only-auth-secret-set-auth-secret-in-env";

function readAuthSecretFromEnv(): string | undefined {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return secret?.trim() ? secret : undefined;
}

/** True when AUTH_SECRET / NEXTAUTH_SECRET is set in the environment. */
export function hasAuthSecret(): boolean {
  return readAuthSecretFromEnv() !== undefined;
}

/**
 * Secret for Auth.js JWT/session signing. In development, falls back when unset
 * so TON Connect sign-in works locally (still set AUTH_SECRET for parity with prod).
 */
export function getAuthSecret(): string {
  const fromEnv = readAuthSecretFromEnv();
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_AUTH_SECRET_FALLBACK;
  }

  return "";
}

/**
 * Returns a clear message when Auth.js cannot run (e.g. missing AUTH_SECRET).
 */
export function getAuthConfigError(): string | null {
  if (hasAuthSecret()) {
    return null;
  }

  if (process.env.NODE_ENV !== "production") {
    return (
      "AUTH_SECRET is not set; using an insecure development fallback. " +
      "Run `npx auth secret` and add AUTH_SECRET to .env for local sign-in parity with production."
    );
  }

  return "AUTH_SECRET is not set. Run `npx auth secret` and add it to the deployment environment.";
}
