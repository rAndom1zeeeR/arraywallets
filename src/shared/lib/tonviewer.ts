const TX_HASH_HEX_PATTERN = /^[a-fA-F0-9]{64}$/;

/**
 * Tonviewer base URL aligned with TonAPI network (mainnet / testnet).
 */
export function resolveTonviewerBaseUrl(tonapiBaseUrl?: string): string {
  if (tonapiBaseUrl?.toLowerCase().includes("testnet")) {
    return "https://testnet.tonviewer.com";
  }

  return "https://tonviewer.com";
}

/**
 * Normalizes TonAPI event / transaction hash to lowercase hex (64 chars).
 */
export function normalizeTransactionHash(value: string): string | null {
  const trimmed = value.trim();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;

  if (!TX_HASH_HEX_PATTERN.test(hex)) {
    return null;
  }

  return hex.toLowerCase();
}

interface EventRawData {
  ext_msg_hash?: string;
}

function readExtMsgHash(rawData: unknown): string | null {
  if (!rawData || typeof rawData !== "object") {
    return null;
  }

  const extMsgHash = (rawData as EventRawData).ext_msg_hash;
  if (typeof extMsgHash !== "string") {
    return null;
  }

  return normalizeTransactionHash(extMsgHash);
}

/**
 * Resolves explorer hash from stored event (`tonEventId` or `rawData.ext_msg_hash`).
 */
export function resolveEventTransactionHash(
  tonEventId: string,
  rawData: unknown
): string | null {
  const fromEventId = normalizeTransactionHash(tonEventId);
  if (fromEventId) {
    return fromEventId;
  }

  return readExtMsgHash(rawData);
}

/**
 * https://tonviewer.com/transaction/{hash}
 */
export function buildTonviewerTransactionUrl(
  tonEventId: string,
  rawData: unknown,
  tonapiBaseUrl?: string
): string | null {
  const hash = resolveEventTransactionHash(tonEventId, rawData);
  if (!hash) {
    return null;
  }

  return `${resolveTonviewerBaseUrl(tonapiBaseUrl)}/transaction/${hash}`;
}

/**
 * https://tonviewer.com/{address}
 */
export function buildTonviewerAccountUrl(
  address: string,
  tonapiBaseUrl?: string
): string {
  return `${resolveTonviewerBaseUrl(tonapiBaseUrl)}/${encodeURIComponent(address)}`;
}
