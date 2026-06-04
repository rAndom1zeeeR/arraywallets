import { publicEnv } from "./env.public.schema";

/**
 * Client-safe config — safe to import from `"use client"` components.
 */

/** TonAPI base URL for Tonviewer links (public, not a secret). */
export const tonapiBaseUrl = publicEnv.NEXT_PUBLIC_TONAPI_BASE_URL;
