import { RateLimiter } from "@/shared/infrastructure/tonapi/rate-limiter";
import { abortableDelay, throwIfAborted } from "@/shared/infrastructure/sync/sync-abort";

/** TonAPI free tier — stay under ~1 RPS with headroom for burst recovery. */
export const TONAPI_MIN_INTERVAL_MS = 1500;

export const TONAPI_LIMITER = new RateLimiter(TONAPI_MIN_INTERVAL_MS);

interface HttpLikeError {
  status?: number;
  message?: string;
  originalCause?: unknown;
}

export function isTonApiRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const typed = error as HttpLikeError;
  if (typed.status === 429) {
    return true;
  }

  if (typeof typed.message === "string" && typed.message.includes("429")) {
    return true;
  }

  const cause = typed.originalCause;
  if (cause && typeof cause === "object" && "status" in cause) {
    return (cause as { status?: number }).status === 429;
  }

  return false;
}

function parseRetryAfterMs(error: unknown): number | null {
  const cause =
    error && typeof error === "object" && "originalCause" in error
      ? (error as HttpLikeError).originalCause
      : null;

  if (!cause || typeof cause !== "object" || !("headers" in cause)) {
    return null;
  }

  const headers = (cause as { headers: Headers }).headers;
  const retryAfter = headers.get("retry-after") ?? headers.get("Retry-After");
  if (!retryAfter) {
    return null;
  }

  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(seconds) && seconds > 0) {
    return seconds * 1000;
  }

  const dateMs = Date.parse(retryAfter);
  if (Number.isFinite(dateMs)) {
    const delay = dateMs - Date.now();
    return delay > 0 ? delay : null;
  }

  return null;
}

/**
 * Runs a TonAPI call through the shared limiter with exponential backoff on HTTP 429.
 */
export async function callTonapi<T>(
  fn: () => Promise<T>,
  signal?: AbortSignal,
  maxRetries = 6
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await TONAPI_LIMITER.throttle(fn, signal);
    } catch (error) {
      if (!isTonApiRateLimitError(error) || attempt >= maxRetries) {
        throw error;
      }

      attempt += 1;
      const retryAfterMs = parseRetryAfterMs(error);
      const backoffMs = Math.min(30_000, TONAPI_MIN_INTERVAL_MS * 2 ** attempt);
      const delayMs = retryAfterMs ?? backoffMs;

      throwIfAborted(signal);
      await abortableDelay(delayMs, signal);
    }
  }
}
