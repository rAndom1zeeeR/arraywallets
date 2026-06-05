"use client";

import { useCallback, useState } from "react";
import { Copy } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface CopyToClipboardButtonProps {
  value: string;
  className?: string;
  iconClassName?: string;
  label?: string;
}

export const CopyToClipboardButton = ({
  value,
  className,
  iconClassName = "size-3.5",
  label = "Copy address",
}: CopyToClipboardButtonProps) => {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
    }
  }, [value]);

  const ariaLabel =
    state === "copied" ? "Copied" : state === "error" ? "Copy failed" : label;

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className={cn("text-muted-foreground transition-colors hover:text-foreground", className)}
      aria-label={ariaLabel}
    >
      <Copy className={iconClassName} aria-hidden />
    </button>
  );
};
