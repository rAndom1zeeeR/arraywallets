"use client";

import { useState, useCallback, type FormEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Address } from "@ton/core";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { buttonStyles } from "@/shared/presentation/components/data-table/data-table.styles";
import { cn } from "@/shared/lib/utils";

/**
 * Validates a TON address and navigates to the wallet page with auto-sync.
 */
export function AnalyzeWalletForm() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      const trimmed = value.trim();
      if (!trimmed) {
        setError("Введите адрес кошелька");
        return;
      }

      try {
        const address = normalizeWalletAddress(Address.parse(trimmed).toString());
        setIsSubmitting(true);
        router.push(
          getWalletPagePath(address, {
            sync: true,
          })
        );
      } catch {
        setError("Некорректный TON-адрес");
        setIsSubmitting(false);
      }
    },
    [router, value]
  );

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setError(null);
    }
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor="wallet-address" className="block text-sm font-medium text-foreground">
        Новый кошелёк для анализа
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="wallet-address"
          type="text"
          value={value}
          onChange={event => {
            setValue(event.target.value);
            if (error) {
              setError(null);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="EQ... или UQ..."
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "wallet-address-error" : undefined}
          disabled={isSubmitting}
          className={cn(
            "min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground",
            "placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-loss/50 focus-visible:border-loss focus-visible:ring-loss/20"
          )}
        />
        <button
          type="submit"
          disabled={isSubmitting || !value.trim()}
          className={cn(buttonStyles.primary, "shrink-0 px-6")}
        >
          {isSubmitting ? "Открываем…" : "Анализировать"}
        </button>
      </div>
      {error && (
        <p id="wallet-address-error" role="alert" className="text-sm text-loss">
          {error}
        </p>
      )}
    </form>
  );
}
