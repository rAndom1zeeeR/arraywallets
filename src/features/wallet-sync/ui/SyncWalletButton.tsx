"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncWalletEventsAction } from "@/features/wallet-sync/sync-wallet-events.action";

interface SyncWalletButtonProps {
  walletAddress: string;
}

export const SyncWalletButton = ({ walletAddress }: SyncWalletButtonProps) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusText, setStatusText] = useState<string | null>(null);

  const handleSync = (): void => {
    startTransition(async () => {
      setStatusText("Синхронизация: по 100 событий (API → база)…");

      const result = await syncWalletEventsAction(walletAddress);

      if (!result.success) {
        setStatusText(result.error ?? "Ошибка синхронизации");
        return;
      }

      const truncated = result.hasMore ? " (лимит батчей, нажми ещё раз)" : "";
      setStatusText(
        `Готово: +${result.totalSaved} в базу, ${result.totalFetched} с API, ${result.batches} батч(ей) по 100${truncated}`,
      );
      router.refresh();
    });
  };

  return (
    <div className="mb-4 flex flex-col gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={isPending}
        className="w-fit rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 dark:bg-sky-500 dark:hover:bg-sky-600"
        aria-busy={isPending}
      >
        {isPending ? "Синхронизация…" : "Синхронизация"}
      </button>
      {statusText != null && (
        <p className="text-sm text-gray-600 dark:text-gray-400" role="status">
          {statusText}
        </p>
      )}
    </div>
  );
};
