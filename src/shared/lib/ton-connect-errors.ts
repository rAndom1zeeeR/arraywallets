import { UserRejectsError } from "@tonconnect/sdk";

/** User-facing message when a TON Connect transaction is cancelled or rejected. */
export const TON_TRANSACTION_CANCELLED_MESSAGE = "Transaction cancelled";

/**
 * Returns true when the user cancelled or rejected a TON Connect transaction.
 */
export function isTonTransactionCancelledError(error: unknown): boolean {
  if (error instanceof UserRejectsError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  if (error.name === "UserRejectsError") {
    return true;
  }

  if (error.message === "Transaction was not sent") {
    return true;
  }

  if (error.message.includes("Transaction was not sent")) {
    return true;
  }

  if (error.message.includes("User rejects the action in the wallet")) {
    return true;
  }

  return false;
}
