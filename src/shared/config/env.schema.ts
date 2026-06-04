/**
 * Environment variables validation schema using Zod
 * Provides type-safe environment variable validation for Next.js
 */

import { z } from "zod";

/**
 * Environment variables schema
 * Validates all environment variables used in the application
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  NEXT_PUBLIC_TONAPI_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_TONAPI_API_KEY: z.string().optional(),
});

/**
 * Validated environment variables type
 */
type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Returns validated environment variables with defaults
 *
 * @returns Validated environment variables
 */
export function validateEnv(): Env {
  const rawEnv = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TONAPI_BASE_URL: process.env.NEXT_PUBLIC_TONAPI_BASE_URL,
    NEXT_PUBLIC_TONAPI_API_KEY: process.env.NEXT_PUBLIC_TONAPI_API_KEY,
  };

  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    // Log validation errors only in development (avoid circular dependency with logger)
    if (process.env.NODE_ENV === "development") {
      console.error("Environment variable validation failed:", JSON.stringify(result.error.issues, null, 2));
    }
    // Return defaults for non-critical variables
    return envSchema.parse({});
  }

  return result.data;
}

/**
 * Validated environment variables
 * Validated once at module load time
 */
export const env = validateEnv();
