import { cn } from "@/shared/lib/utils";

export type PnlTone = "profit" | "loss" | "neutral";

export function pnlToneFromNumber(value: number | null | undefined): PnlTone {
  if (value === null || value === undefined) {
    return "neutral";
  }

  if (value > 0) {
    return "profit";
  }

  if (value < 0) {
    return "loss";
  }

  return "neutral";
}

export function pnlToneFromBigint(value: bigint): PnlTone {
  if (value > 0n) {
    return "profit";
  }

  if (value < 0n) {
    return "loss";
  }

  return "neutral";
}

export function pnlToneClassName(tone: PnlTone): string {
  return cn(
    tone === "profit" && "text-green-600 dark:text-green-400",
    tone === "loss" && "text-red-600 dark:text-red-400",
    tone === "neutral" && "text-gray-900 dark:text-gray-100"
  );
}

export function pnlClassNameFromNumber(value: number | null | undefined): string {
  return pnlToneClassName(pnlToneFromNumber(value));
}

export function pnlClassNameFromBigint(value: bigint): string {
  return pnlToneClassName(pnlToneFromBigint(value));
}
