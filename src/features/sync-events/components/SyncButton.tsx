"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";

interface SyncButtonProps {
  address: string;
  isSyncing: boolean;
}

interface SyncResult {
  saved: number;
  skipped: number;
  repaired: number;
  errors: number;
  actionsSaved: number;
  hasMore: boolean;
  cancelled?: boolean;
  force?: boolean;
  clearedEvents?: number;
  stats?: { events: number; actions: number; incompleteEvents: number };
}

interface RunSyncOptions {
  force?: boolean;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function SyncButton({ address, isSyncing: initialSyncing }: SyncButtonProps) {
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const [isSyncing, setIsSyncing] = useState(initialSyncing);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const runSync = useCallback(
    async ({ force = false }: RunSyncOptions) => {
      if (isSyncing) {
        return;
      }

      if (force) {
        const confirmed = window.confirm(
          `Удалить из БД только события кошелька ${address} и загрузить историю заново с TonAPI? Другие кошельки не затрагиваются.`
        );
        if (!confirmed) {
          return;
        }
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsSyncing(true);
      setResult(null);

      try {
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address,
            force,
            continueFromLast: !force,
            repair: !force,
            maxPagesPerRun: 50,
          }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok && !data.cancelled) {
          throw new Error(data.error || data.message || "Sync failed");
        }

        setResult({
          saved: data.saved ?? 0,
          skipped: data.skipped ?? 0,
          repaired: data.repaired ?? 0,
          errors: data.errors ?? 0,
          actionsSaved: data.actionsSaved ?? 0,
          hasMore: Boolean(data.hasMore),
          cancelled: Boolean(data.cancelled),
          force: Boolean(data.force),
          clearedEvents: data.clearedEvents ?? 0,
          stats: data.stats,
        });

        router.refresh();

        if (!data.cancelled && !data.hasMore) {
          window.location.reload();
        }
      } catch (error) {
        if (isAbortError(error)) {
          setResult({
            saved: 0,
            skipped: 0,
            repaired: 0,
            errors: 0,
            actionsSaved: 0,
            hasMore: true,
            cancelled: true,
          });
          router.refresh();
          return;
        }

        console.error("Sync failed:", error);
        alert(error instanceof Error ? error.message : "Sync failed");
      } finally {
        abortRef.current = null;
        setIsSyncing(false);
      }
    },
    [address, isSyncing, router]
  );

  const handleSync = useCallback(() => {
    void runSync({ force: false });
  }, [runSync]);

  const handleForceSync = useCallback(() => {
    void runSync({ force: true });
  }, [runSync]);

  return (
    <div className="flex flex-col items-end gap-2">
      {result && (
        <div className="text-right text-sm text-gray-600 dark:text-gray-400">
          {result.cancelled && (
            <p className="mb-1 font-medium text-amber-600 dark:text-amber-500">Синхронизация остановлена</p>
          )}
          {result.force && !result.cancelled && (
            <p className="mb-1 font-medium text-orange-600 dark:text-orange-400">
              Полный ресинк: удалено {result.clearedEvents ?? 0} events из БД
            </p>
          )}
          <span>
            Saved: <span className="font-medium text-green-600">{result.saved}</span>
          </span>
          {result.repaired > 0 && (
            <span>
              , Repaired: <span className="font-medium text-orange-600">{result.repaired}</span>
            </span>
          )}
          {result.skipped > 0 && (
            <span>
              , Skipped: <span className="font-medium text-gray-600">{result.skipped}</span>
            </span>
          )}
          {result.errors > 0 && (
            <span>
              , Errors: <span className="font-medium text-red-600">{result.errors}</span>
            </span>
          )}
          {result.stats && (
            <span>
              {" "}
              | DB: {result.stats.events} events, {result.stats.actions} actions
              {result.stats.incompleteEvents > 0 && (
                <span className="text-red-600">, {result.stats.incompleteEvents} incomplete</span>
              )}
            </span>
          )}
          {result.hasMore && !result.cancelled && (
            <p className="mt-1 text-sky-600 dark:text-sky-400">Есть ещё история — нажми Sync ещё раз для продолжения</p>
          )}
          {result.cancelled && result.hasMore && (
            <p className="mt-1 text-sky-600 dark:text-sky-400">Прогресс сохранён — можно продолжить синхронизацию</p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className={`rounded px-4 py-2 font-medium transition-colors ${
            isSyncing
              ? "cursor-not-allowed bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              : "bg-sky-600 text-white hover:bg-sky-700"
          }`}
        >
          {isSyncing ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Syncing...
            </span>
          ) : (
            "Continue sync"
          )}
        </button>
        <button
          type="button"
          onClick={handleForceSync}
          disabled={isSyncing}
          aria-label="Полный ресинк — очистить БД и загрузить заново"
          className="rounded border border-orange-300 bg-white px-4 py-2 font-medium text-orange-700 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-orange-800 dark:bg-gray-900 dark:text-orange-400 dark:hover:bg-orange-950"
        >
          Force resync
        </button>
        {isSyncing && (
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Отменить синхронизацию"
            className="rounded border border-red-300 bg-white px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Отмена
          </button>
        )}
      </div>
    </div>
  );
}
