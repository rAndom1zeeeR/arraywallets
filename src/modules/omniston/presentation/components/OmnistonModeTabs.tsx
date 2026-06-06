"use client";

import { ArrowLeftRight, Repeat } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { OmnistonMode } from "@/modules/omniston/presentation/omniston-mode.types";
import { useOmnistonMode } from "@/modules/omniston/presentation/providers/OmnistonModeProvider";

interface OmnistonModeTabsProps {
  className?: string;
}

const TABS = [
  {
    id: OmnistonMode.TRANSFER,
    label: "Transfer",
    icon: ArrowLeftRight,
  },
  {
    id: OmnistonMode.SWAP,
    label: "Swap",
    icon: Repeat,
  },
] as const;

export const OmnistonModeTabs = ({ className }: OmnistonModeTabsProps) => {
  const { mode, setMode } = useOmnistonMode();

  return (
    <div
      className={cn(
        "inline-flex w-full rounded-full border border-border/60 bg-muted/40 p-1",
        className,
      )}
      role="tablist"
      aria-label="Omniston mode"
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = mode === id;

        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => setMode(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium transition-colors sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
};
