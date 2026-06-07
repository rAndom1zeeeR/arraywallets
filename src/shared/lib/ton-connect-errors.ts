import { UserRejectsError } from "@tonconnect/sdk";

/** User-facing message when a wallet transaction is cancelled or rejected. */
export const TRANSACTION_CANCELLED_MESSAGE = "Transaction cancelled";

/** @deprecated Use {@link TRANSACTION_CANCELLED_MESSAGE} */
export const TON_TRANSACTION_CANCELLED_MESSAGE = TRANSACTION_CANCELLED_MESSAGE;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorName(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.name;
  }

  if (isRecord(error) && typeof error.name === "string") {
    return error.name;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (isRecord(error) && typeof error.message === "string") {
    return error.message;
  }

  return "";
}

function getErrorCode(error: unknown): number | undefined {
  if (isRecord(error) && typeof error.code === "number") {
    return error.code;
  }

  return undefined;
}

/**
 * Returns true when the user cancelled or rejected an EVM wallet request (viem / WalletConnect).
 */
export function isEvmTransactionCancelledError(error: unknown): boolean {
  const name = getErrorName(error);
  if (name === "UserRejectedRequestError" || name === "ConnectorUserRejectedError") {
    return true;
  }

  const message = getErrorMessage(error).toLowerCase();
  if (message.includes("user rejected the request")) {
    return true;
  }

  if (message.includes("user denied")) {
    return true;
  }

  if (message.includes("rejected the request")) {
    return true;
  }

  const code = getErrorCode(error);
  if (code === 4001) {
    return true;
  }

  return false;
}

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

/**
 * Returns true when the user cancelled or rejected a TON or EVM wallet transaction.
 */
export function isTransactionCancelledError(error: unknown): boolean {
  return isTonTransactionCancelledError(error) || isEvmTransactionCancelledError(error);
}
