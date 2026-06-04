/**
 * Auth.js configuration helpers (server-only).
 */

/**
 * Comma-separated admin emails from AUTH_ADMIN_EMAILS.
 */
export function getAuthAdminEmails(): string[] {
  const raw = process.env.AUTH_ADMIN_EMAILS;
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Comma-separated admin wallet addresses (raw `workchain:hex`) from AUTH_ADMIN_WALLETS.
 */
export function getAuthAdminWallets(): string[] {
  const raw = process.env.AUTH_ADMIN_WALLETS;
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map(entry => entry.trim())
    .filter(Boolean);
}

/**
 * Domains allowed in ton_proof signatures (host only, no protocol).
 */
function getPrimaryTonConnectDomain(): string {
  const fromEnv = process.env.AUTH_TON_CONNECT_DOMAIN?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      return new URL(appUrl.startsWith("http") ? appUrl : `https://${appUrl}`).host;
    } catch {
      // ignore invalid URL
    }
  }

  return "wallets.arrayton.com";
}

/**
 * Domains allowed in ton_proof signatures (host only, no protocol).
 * Mirrors ArrayTonV16: primary prod domain + localhost variants for local dev with prod manifest.
 */
export function getTonProofAllowedDomains(): string[] {
  const primary = getPrimaryTonConnectDomain();
  const domains = new Set<string>([primary]);

  const fromEnv = process.env.AUTH_TON_PROOF_DOMAINS;
  if (fromEnv?.trim()) {
    for (const domain of fromEnv.split(",")) {
      const trimmed = domain.trim();
      if (trimmed) {
        domains.add(trimmed);
      }
    }
  }

  if (primary === "wallets.arrayton.com" || primary === "arrayton.com") {
    domains.add("localhost");
    domains.add("localhost:3000");
    domains.add("127.0.0.1");
    domains.add("127.0.0.1:3000");
  }

  return [...domains];
}
