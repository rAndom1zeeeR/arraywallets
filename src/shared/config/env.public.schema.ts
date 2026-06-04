/**
 * Client-safe environment variables (NEXT_PUBLIC_* only).
 */

import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_TONAPI_BASE_URL: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function validatePublicEnv(): PublicEnv {
  const rawEnv = {
    NEXT_PUBLIC_TONAPI_BASE_URL: process.env.NEXT_PUBLIC_TONAPI_BASE_URL,
  };

  const result = publicEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "Public environment variable validation failed:",
        JSON.stringify(result.error.issues, null, 2)
      );
    }
    return publicEnvSchema.parse({});
  }

  return result.data;
}

export const publicEnv = validatePublicEnv();
