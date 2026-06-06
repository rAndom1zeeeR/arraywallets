import { publicEnv } from "./env.public.schema";

/**
 * Client-safe config — safe to import from `"use client"` components.
 */

/** TonAPI base URL for Tonviewer links (public, not a secret). */
export const tonapiBaseUrl = publicEnv.NEXT_PUBLIC_TONAPI_BASE_URL;

/** Omniston WebSocket API URL (defaults to production). */
export const omnistonWsUrl =
  publicEnv.NEXT_PUBLIC_OMNISTON_WS_URL ?? "wss://omni-ws.ston.fi";

/** Reown project id for EVM wallet connect on Omnistone — https://cloud.reown.com */
export const walletConnectProjectId = publicEnv.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID?.trim();

/** True when AppKit / WalletConnect can be initialized (avoids 403 on placeholder ids). */
export const isWalletConnectConfigured = Boolean(walletConnectProjectId);
