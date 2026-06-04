/**
 * Server-only environment variables. Do not import from client components.
 */

import { z } from "zod";

/** Next sets this during `next build`; secrets are injected at runtime (Docker/Vercel). */
function isNextProductionBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/** Treat blank env vars as unset (common in .env / Docker with `KEY=`). */
function optionalNonEmptyString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const optionalNonEmpty = z.preprocess(
  (value: unknown) => (typeof value === "string" ? optionalNonEmptyString(value) : value),
  z.string().min(1).optional()
);

const authSecretSchema =
  process.env.NODE_ENV === "production" && !isNextProductionBuild()
    ? z.string().min(1, "AUTH_SECRET is required in production")
    : z.string().min(1).optional();

const serverEnvSchema = z.object({
  TONAPI_API_KEY: optionalNonEmpty,
  AUTH_SECRET: authSecretSchema,
  AUTH_GITHUB_ID: optionalNonEmpty,
  AUTH_GITHUB_SECRET: optionalNonEmpty,
  AUTH_GOOGLE_ID: optionalNonEmpty,
  AUTH_GOOGLE_SECRET: optionalNonEmpty,
  AUTH_ADMIN_EMAILS: optionalNonEmpty,
  AUTH_ADMIN_WALLETS: optionalNonEmpty,
  AUTH_TON_PROOF_DOMAINS: optionalNonEmpty,
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function resolveTonapiApiKey(): string | undefined {
  const serverKey = optionalNonEmptyString(process.env.TONAPI_API_KEY);
  if (serverKey) {
    return serverKey;
  }

  const legacyPublicKey = optionalNonEmptyString(process.env.NEXT_PUBLIC_TONAPI_API_KEY);
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
    AUTH_GITHUB_ID: optionalNonEmptyString(process.env.AUTH_GITHUB_ID),
    AUTH_GITHUB_SECRET: optionalNonEmptyString(process.env.AUTH_GITHUB_SECRET),
    AUTH_GOOGLE_ID: optionalNonEmptyString(process.env.AUTH_GOOGLE_ID),
    AUTH_GOOGLE_SECRET: optionalNonEmptyString(process.env.AUTH_GOOGLE_SECRET),
    AUTH_ADMIN_EMAILS: optionalNonEmptyString(process.env.AUTH_ADMIN_EMAILS),
    AUTH_ADMIN_WALLETS: optionalNonEmptyString(process.env.AUTH_ADMIN_WALLETS),
    AUTH_TON_PROOF_DOMAINS: optionalNonEmptyString(process.env.AUTH_TON_PROOF_DOMAINS),
  });

  if (!result.success) {
    const details = result.error.issues
      .map(issue => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");

    if (process.env.NODE_ENV !== "production" || isNextProductionBuild()) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "Server environment variable validation failed:",
          JSON.stringify(result.error.issues, null, 2)
        );
      }
      return serverEnvSchema.parse({
        AUTH_SECRET: resolveAuthSecret(),
      });
    }

    throw new Error(`Server environment validation failed: ${details}`);
  }

  return result.data;
}

export const serverEnv = validateServerEnv();
