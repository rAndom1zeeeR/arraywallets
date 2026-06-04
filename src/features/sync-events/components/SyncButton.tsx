"use client";

import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

interface SyncButtonProps {
  address: string;
  isSyncing: boolean;
}

export function SyncButton({ address, isSyncing: initialSyncing }: SyncButtonProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(initialSyncing);
  const [result, setResult] = useState<{
    saved: number;
    skipped: number;
    repaired: number;
    errors: number;
    actionsSaved: number;
    hasMore: boolean;
    stats?: { events: number; actions: number; incompleteEvents: number };
  } | null>(null);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;

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
          continueFromLast: true,
          repair: true,
          maxPagesPerRun: 50,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Sync failed");
      }

      setResult({
        saved: data.saved,
        skipped: data.skipped,
        repaired: data.repaired ?? 0,
        errors: data.errors,
        actionsSaved: data.actionsSaved ?? 0,
        hasMore: Boolean(data.hasMore),
        stats: data.stats,
      });

      router.refresh();

      if (!data.hasMore) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Sync failed:", error);
      alert(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  }, [address, isSyncing, router]);

  return (
    <div className="flex flex-col items-end gap-2">
      {result && (
        <div className="text-right text-sm text-gray-600">
          <span>
            Saved: <span className="font-medium text-green-600">{result.saved}</span>
          </span>
          {result.repaired > 0 && (
            <span>
              , Repaired:{" "}
              <span className="font-medium text-orange-600">{result.repaired}</span>
            </span>
          )}
          {result.skipped > 0 && (
            <span>
              , Skipped:{" "}
              <span className="font-medium text-gray-600">{result.skipped}</span>
            </span>
          )}
          {result.errors > 0 && (
            <span>
              , Errors:{" "}
              <span className="font-medium text-red-600">{result.errors}</span>
            </span>
          )}
          {result.stats && (
            <span>
              {" "}
              | DB: {result.stats.events} events, {result.stats.actions} actions
              {result.stats.incompleteEvents > 0 && (
                <span className="text-red-600">
                  , {result.stats.incompleteEvents} incomplete
                </span>
              )}
            </span>
          )}
          {result.hasMore && (
            <p className="mt-1 text-sky-600">
              Есть ещё история — нажми Sync ещё раз для продолжения
            </p>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={handleSync}
        disabled={isSyncing}
        className={`px-4 py-2 rounded font-medium transition-colors ${
          isSyncing
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-sky-600 text-white hover:bg-sky-700"
        }`}
      >
        {isSyncing ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden>
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
    </div>
  );
}
