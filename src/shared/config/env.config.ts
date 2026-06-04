import { env } from "./env.schema";

/**
 * Check if running in production
 */
export const isProduction = env.NODE_ENV === "production";

/**
 * Check if running in development
 */
export const isDevelopment = env.NODE_ENV === "development";

/**
 * Get the TonAPI base URL
 */
export const tonapiBaseUrl = env.NEXT_PUBLIC_TONAPI_BASE_URL;

/**
 * Get the TonAPI API key
 */
export const tonapiApiKey = env.NEXT_PUBLIC_TONAPI_API_KEY;
