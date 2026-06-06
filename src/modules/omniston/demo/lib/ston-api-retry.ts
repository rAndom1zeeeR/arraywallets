const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }

  if ("cause" in error) {
    return getErrorCode(error.cause);
  }

  return undefined;
}

function isRetryableStonApiError(error: unknown): boolean {
  const code = getErrorCode(error);

  if (code && RETRYABLE_ERROR_CODES.has(code)) {
    return true;
  }

  if (error instanceof Error) {
    return error.message.includes("fetch failed") || error.message.includes("<no response>");
  }

  return false;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Retries transient ston.fi HTTP failures (TLS reset, timeouts, DNS blips).
 */
export async function withStonApiRetry<T>(
  operation: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 500;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= maxAttempts || !isRetryableStonApiError(error)) {
        throw error;
      }

      await wait(baseDelayMs * attempt);
    }
  }

  throw lastError;
}
