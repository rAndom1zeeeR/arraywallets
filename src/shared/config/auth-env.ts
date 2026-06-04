/**
 * Auth.js required environment (server-only).
 */

export function getAuthSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return secret?.trim() ? secret : undefined;
}

/**
 * Returns a clear message when Auth.js cannot run in production (e.g. missing AUTH_SECRET).
 */
export function getAuthConfigError(): string | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  if (!getAuthSecret()) {
    return "AUTH_SECRET is not set. Run `npx auth secret` and add it to the deployment environment.";
  }

  return null;
}
