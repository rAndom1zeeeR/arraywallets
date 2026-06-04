import { abortableDelay, throwIfAborted } from "@/shared/infrastructure/sync/sync-abort";

export class RateLimiter {
  private lastRequestTime = 0;

  constructor(private minIntervalMs: number) {
    this.minIntervalMs = minIntervalMs;
  }

  async throttle<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    throwIfAborted(signal);

    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minIntervalMs) {
      await abortableDelay(this.minIntervalMs - elapsed, signal);
    }

    throwIfAborted(signal);
    this.lastRequestTime = Date.now();
    return fn();
  }
}
