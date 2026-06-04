export class SyncCancelledError extends Error {
  constructor(message = "Sync cancelled") {
    super(message);
    this.name = "SyncCancelledError";
  }
}

export function isSyncCancelledError(error: unknown): boolean {
  if (error instanceof SyncCancelledError) {
    return true;
  }
  return error instanceof DOMException && error.name === "AbortError";
}

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new SyncCancelledError();
  }
}

/**
 * Delay that rejects when the sync abort signal fires.
 */
export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);

  if (!signal || ms <= 0) {
    return new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, ms));
    });
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(new SyncCancelledError());
    };

    signal.addEventListener("abort", onAbort);
  });
}
