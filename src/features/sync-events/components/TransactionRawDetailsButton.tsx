"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { TransactionRawDetailsPayload } from "@/features/sync-events/lib/raw-details.utils";
import { cn } from "@/shared/lib/utils";

interface TransactionRawDetailsButtonProps {
  details: TransactionRawDetailsPayload;
  className?: string;
}

function formatJson(payload: TransactionRawDetailsPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function TransactionRawDetailsButton({ details, className }: TransactionRawDetailsButtonProps) {
  const dialogTitleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  const formattedJson = formatJson(details);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setCopyState("idle");
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCopyState("idle");
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }, [formattedJson]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [handleClose, isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800",
          className
        )}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        More
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Закрыть" onClick={handleClose} />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <h2 id={dialogTitleId} className="text-sm font-semibold">
                  Сырые данные транзакции
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {details.action.type.replace(/_/g, " ")} · event {details.event.tonEventId.slice(0, 8)}…
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void handleCopy();
                  }}
                  className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {copyState === "copied"
                    ? "Скопировано"
                    : copyState === "error"
                      ? "Ошибка копирования"
                      : "Копировать JSON"}
                </button>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={handleClose}
                  className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  aria-label="Закрыть диалог"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="overflow-auto p-4">
              <pre className="rounded bg-gray-50 p-3 font-mono text-xs leading-relaxed break-all whitespace-pre-wrap text-gray-800 dark:bg-gray-950 dark:text-gray-200">
                {formattedJson}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
