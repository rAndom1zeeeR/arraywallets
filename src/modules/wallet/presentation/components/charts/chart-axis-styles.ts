import type { CSSProperties } from "react";
import { WALLET_CHART_DEFAULT_HEIGHT, WALLET_CHART_MUTED } from "@/modules/wallet/domain/wallet-chart.constants";

export const CHART_HEIGHT = WALLET_CHART_DEFAULT_HEIGHT;

export const chartAxisTick = {
  fill: WALLET_CHART_MUTED,
  fontSize: 11,
} as const;

export const chartGridStroke = "var(--border)";

export const chartTooltipContentStyle: CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.5rem",
  fontSize: "12px",
  color: "var(--card-foreground)",
};

export const chartTooltipLabelStyle: CSSProperties = {
  color: "var(--card-foreground)",
  fontWeight: 600,
};

export const chartTooltipItemStyle: CSSProperties = {
  color: "var(--card-foreground)",
};

/** Shared Recharts tooltip props for wallet charts. */
export const chartTooltipProps = {
  contentStyle: chartTooltipContentStyle,
  labelStyle: chartTooltipLabelStyle,
  itemStyle: chartTooltipItemStyle,
} as const;

export function formatTooltipAmount(value: unknown, unit = "TON"): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)} ${unit}`;
}

export function formatTooltipTon(value: unknown): string {
  return formatTooltipAmount(value, "TON");
}
