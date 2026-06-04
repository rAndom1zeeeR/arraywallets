import type { TransformedTransaction } from "@/modules/wallet/application/transformer";

/** Ton transfer / text comments that mark lending supply, withdraw, borrow, repay. */
const LENDING_TEXT_PATTERN =
  /\b(?:evaa|storm\s*trade|tsunami|tonco\s*lend)\b.*\b(?:supply|withdraw|borrow|repay|deposit|redeem)\b|\b(?:supply|withdraw|borrow|repay)\b.*\b(?:evaa|storm\s*trade|tsunami|tonco\s*lend)\b/i;

/** Standalone EVAA action labels from Tonviewer / TonAPI (e.g. "EVAA supply."). */
const EVAA_ACTION_PATTERN = /\bevaa\s+(?:supply|withdraw|borrow|repay)\b/i;

/** Any EVAA mention in an event action — lending ops often span several legs. */
const EVAA_MENTION_PATTERN = /\bevaa\b/i;

interface LendingMarkerAction {
  displayDetails: string | null;
  metadata: unknown;
}

function getCommentFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const comment = (metadata as { comment?: unknown }).comment;
  return typeof comment === "string" ? comment : null;
}

function getOperationFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const operation = (metadata as { operation?: unknown }).operation;
  return typeof operation === "string" ? operation : null;
}

/**
 * Returns true when free-form text indicates a lending protocol deposit/withdraw, not a DEX swap.
 */
export function hasLendingMarkerInText(text: string | null | undefined): boolean {
  if (!text) {
    return false;
  }

  const normalized = text.trim();
  if (!normalized) {
    return false;
  }

  return (
    LENDING_TEXT_PATTERN.test(normalized) ||
    EVAA_ACTION_PATTERN.test(normalized) ||
    EVAA_MENTION_PATTERN.test(normalized)
  );
}

/**
 * Scans persisted chain action fields for lending markers.
 */
export function hasLendingMarkerInAction(action: LendingMarkerAction): boolean {
  if (hasLendingMarkerInText(action.displayDetails)) {
    return true;
  }

  if (hasLendingMarkerInText(getCommentFromMetadata(action.metadata))) {
    return true;
  }

  return hasLendingMarkerInText(getOperationFromMetadata(action.metadata));
}

function getTransactionComment(tx: TransformedTransaction): string {
  const comment = tx.details.comment;
  return typeof comment === "string" ? comment : "";
}

function getTransactionOperation(tx: TransformedTransaction): string {
  const operation = tx.details.operation;
  return typeof operation === "string" ? operation : "";
}

/**
 * Returns true when any action in an event marks EVAA / lending supply or withdraw.
 */
export function hasLendingProtocolMarker(transactions: TransformedTransaction[]): boolean {
  for (const tx of transactions) {
    if (hasLendingMarkerInText(getTransactionComment(tx))) {
      return true;
    }

    if (hasLendingMarkerInText(getTransactionOperation(tx))) {
      return true;
    }

    if (hasLendingMarkerInText(tx.description)) {
      return true;
    }
  }

  return false;
}
