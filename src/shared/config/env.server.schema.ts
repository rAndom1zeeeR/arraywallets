/**
 * Server-only environment variables. Do not import from client components.
 */

import { z } from "zod";

const authSecretSchema =
  process.env.NODE_ENV === "production"
    ? z.string().min(1, "AUTH_SECRET is required in production")
    : z.string().min(1).optional();

const serverEnvSchema = z.object({
  TONAPI_API_KEY: z.string().optional(),
  AUTH_SECRET: authSecretSchema,
  AUTH_GITHUB_ID: z.string().min(1).optional(),
  AUTH_GITHUB_SECRET: z.string().min(1).optional(),
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
  AUTH_ADMIN_EMAILS: z.string().optional(),
  AUTH_ADMIN_WALLETS: z.string().optional(),
  AUTH_TON_PROOF_DOMAINS: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function resolveTonapiApiKey(): string | undefined {
  const serverKey = process.env.TONAPI_API_KEY;
  if (serverKey) {
    return serverKey;
  }

  const legacyPublicKey = process.env.NEXT_PUBLIC_TONAPI_API_KEY;
  if (legacyPublicKey && process.env.NODE_ENV !== "production") {
    console.warn(
      "[env] NEXT_PUBLIC_TONAPI_API_KEY is deprecated and leaks into the client bundle. " +
        "Rename it to TONAPI_API_KEY (no NEXT_PUBLIC_ prefix)."
    );
  }

  return legacyPublicKey;
}

function resolveAuthSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  return secret?.trim() ? secret : undefined;
}

export function validateServerEnv(): ServerEnv {
  const result = serverEnvSchema.safeParse({
    TONAPI_API_KEY: resolveTonapiApiKey(),
    AUTH_SECRET: resolveAuthSecret(),
    AUTH_GITHUB_ID: process.env.AUTH_GITHUB_ID,
    AUTH_GITHUB_SECRET: process.env.AUTH_GITHUB_SECRET,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    AUTH_ADMIN_EMAILS: process.env.AUTH_ADMIN_EMAILS,
    AUTH_ADMIN_WALLETS: process.env.AUTH_ADMIN_WALLETS,
    AUTH_TON_PROOF_DOMAINS: process.env.AUTH_TON_PROOF_DOMAINS,
  });

  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Server environment variable validation failed:",
        JSON.stringify(result.error.issues, null, 2)
      );
    }
    return serverEnvSchema.parse({});
  }

  return result.data;
}

export const serverEnv = validateServerEnv();
