"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { walletQueryKeys } from "@/modules/wallet/api/wallet-query-keys";
import { buttonStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface SyncButtonProps {
  address: string;
  isSyncing: boolean;
  incompleteEvents?: number;
  historyComplete?: boolean;
  autoStart?: boolean;
  /** Full-width footer style for explorer sidebar card */
  embedded?: boolean;
}

interface SyncResult {
  saved: number;
  skipped: number;
  repaired: number;
  errors: number;
  actionsSaved: number;
  hasMore: boolean;
  historyComplete?: boolean;
  incrementalOnly?: boolean;
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

export function SyncButton({
  address,
  isSyncing: initialSyncing,
  incompleteEvents = 0,
  historyComplete = false,
  autoStart = false,
  embedded = false,
}: SyncButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const abortRef = useRef<AbortController | null>(null);
  const autoStartTriggeredRef = useRef(false);
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
          `Delete only this wallet's events from the database and reload history from TonAPI? Other wallets are not affected.`
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
          historyComplete: Boolean(data.historyComplete),
          incrementalOnly: Boolean(data.incrementalOnly),
          cancelled: Boolean(data.cancelled),
          force: Boolean(data.force),
          clearedEvents: data.clearedEvents ?? 0,
          stats: data.stats,
        });

        await queryClient.invalidateQueries({ queryKey: walletQueryKeys.root(address) });
        router.refresh();
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
    [address, isSyncing, queryClient, router]
  );

  const handleSync = useCallback(() => {
    void runSync({ force: false });
  }, [runSync]);

  const handleForceSync = useCallback(() => {
    void runSync({ force: true });
  }, [runSync]);

  useEffect(() => {
    if (!autoStart || autoStartTriggeredRef.current || initialSyncing) {
      return;
    }

    autoStartTriggeredRef.current = true;
    void runSync({ force: false });
  }, [autoStart, initialSyncing, runSync]);

  const hasIncompleteEvents = incompleteEvents > 0;
  const syncButtonLabel = isSyncing
    ? "Syncing..."
    : hasIncompleteEvents
      ? `Sync + repair (${incompleteEvents})`
      : historyComplete
        ? "Sync new"
        : "Continue sync";

  return (
    <div className={cn("flex flex-col gap-2", embedded ? "w-full items-stretch" : "items-end")}>
      {hasIncompleteEvents && !isSyncing && !embedded && (
        <p className="max-w-sm text-right text-xs text-amber-400">
          {incompleteEvents} incomplete events — repair runs automatically on Sync
        </p>
      )}
      {result && !embedded && (
        <div className="text-right text-sm text-muted-foreground">
          {result.cancelled && (
            <p className="mb-1 font-medium text-amber-400">Sync stopped</p>
          )}
          {result.incrementalOnly && !result.cancelled && (
            <p className="mb-1 font-medium text-profit">New transactions only</p>
          )}
          {result.force && !result.cancelled && (
            <p className="mb-1 font-medium text-orange-400">
              Full resync: cleared {result.clearedEvents ?? 0} events from DB
            </p>
          )}
          <span>
            Saved: <span className="font-medium text-profit">{result.saved}</span>
          </span>
          {result.repaired > 0 && (
            <span>
              , Repaired: <span className="font-medium text-orange-400">{result.repaired}</span>
            </span>
          )}
          {result.skipped > 0 && (
            <span>
              , Skipped: <span className="font-medium text-muted-foreground">{result.skipped}</span>
            </span>
          )}
          {result.errors > 0 && (
            <span>
              , Errors: <span className="font-medium text-loss">{result.errors}</span>
            </span>
          )}
          {result.stats && (
            <span>
              {" "}
              | DB: {result.stats.events} events, {result.stats.actions} actions
              {result.stats.incompleteEvents > 0 && (
                <span className="text-loss">, {result.stats.incompleteEvents} incomplete</span>
              )}
            </span>
          )}
          {result.hasMore && !result.cancelled && (
            <p className="mt-1 text-primary">More history available — click Sync again to continue</p>
          )}
          {result.cancelled && result.hasMore && (
            <p className="mt-1 text-primary">Progress saved — you can continue syncing</p>
          )}
        </div>
      )}
      <div
        className={cn(
          "flex flex-wrap gap-2",
          embedded ? "w-full flex-col" : "items-center justify-end"
        )}
      >
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className={cn(
            embedded
              ? cn(
                  explorerStyles.syncFooter,
                  "rounded-none bg-explorer-sync hover:opacity-90"
                )
              : hasIncompleteEvents && !isSyncing
                ? buttonStyles.warning
                : buttonStyles.primary,
            isSyncing && "cursor-not-allowed opacity-50"
          )}
        >
          {isSyncing ? (
            <span className="inline-flex items-center justify-center gap-2">
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
            syncButtonLabel
          )}
        </button>
        {isAdmin && !embedded ? (
          <button
            type="button"
            onClick={handleForceSync}
            disabled={isSyncing}
            aria-label="Full resync — clear DB and reload"
            className={cn(buttonStyles.secondary, "border-orange-500/30 text-orange-400 hover:bg-orange-500/10")}
          >
            Force resync
          </button>
        ) : null}
        {isSyncing && (
          <div className={cn(embedded && "px-5 pb-5")}>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Cancel sync"
              className={cn(buttonStyles.danger, embedded && "w-full")}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
