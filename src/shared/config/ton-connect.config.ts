/**
 * TON Connect manifest URL (server-safe; no window).
 * Dev uses production HTTPS manifest so wallets accept it; proof domain must be allowed in auth.config.
 */

const DEFAULT_APP_URL = "https://ton-wallets.vercel.app";

const TON_CONNECT_PROD_MANIFEST_URL = `${DEFAULT_APP_URL}/tonconnect-manifest.json`;

function getAppBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) {
    return url.startsWith("http") ? url.replace(/\/$/, "") : `https://${url}`;
  }

  return DEFAULT_APP_URL;
}

/**
 * Manifest URL for TonConnectUIProvider.
 * Development: production manifest (localhost manifest is often rejected by wallets).
 * Production: app origin manifest.
 */
export function getTonConnectManifestUrl(): string {
  if (process.env.NODE_ENV === "development") {
    return TON_CONNECT_PROD_MANIFEST_URL;
  }

  return `${getAppBaseUrl()}/tonconnect-manifest.json`;
}

/** Resolved once at module load for client provider props. */
export const TON_CONNECT_MANIFEST_URL = getTonConnectManifestUrl();

/** Refresh ton_proof payload before server challenge TTL (~15 min). */
export const TON_PROOF_PAYLOAD_REFRESH_MS = 10 * 60 * 1000;
