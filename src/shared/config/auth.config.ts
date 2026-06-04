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
export function getTonProofAllowedDomains(): string[] {
  const fromEnv = process.env.AUTH_TON_PROOF_DOMAINS;
  const domains = new Set<string>(["localhost:3000", "wallets.arrayton.com"]);

  if (fromEnv?.trim()) {
    for (const domain of fromEnv.split(",")) {
      const trimmed = domain.trim();
      if (trimmed) {
        domains.add(trimmed);
      }
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      domains.add(new URL(appUrl).host);
    } catch {
      // ignore invalid URL
    }
  }

  return [...domains];
}
