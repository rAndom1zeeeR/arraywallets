export class RateLimiter {
  private lastRequestTime = 0;

  constructor(private minIntervalMs: number) {
    this.minIntervalMs = minIntervalMs;
  }

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minIntervalMs) {
      await new Promise(r => setTimeout(r, this.minIntervalMs - elapsed));
    }

    this.lastRequestTime = Date.now();
    return fn();
  }
}
