import { formatPercentRatio, formatTonAmount, formatUsd } from "@/modules/jetton/domain/money-format.utils";
import { pnlClassNameFromNumber, pnlToneClassName, pnlToneFromNumber } from "@/modules/jetton/domain/pnl-display.utils";
import { cn } from "@/shared/lib/utils";

interface PnlAmountStackProps {
  ton?: number | null;
  usd?: number | null;
  percentTon?: number | null;
  percentUsd?: number | null;
  size?: "sm" | "lg";
}

export function PnlAmountStack({
  ton,
  usd,
  percentTon,
  percentUsd,
  size = "sm",
}: PnlAmountStackProps) {
  const hasTon = ton !== null && ton !== undefined;
  const hasUsd = usd !== null && usd !== undefined;
  const pctTonText = formatPercentRatio(percentTon ?? null);
  const pctUsdText = formatPercentRatio(percentUsd ?? null);
  const hasPercent = Boolean(pctTonText || pctUsdText);

  if (!hasTon && !hasUsd) {
    return <span className="text-muted-foreground">—</span>;
  }

  const amountClass = size === "lg" ? "text-lg font-semibold tabular-nums" : "font-medium tabular-nums text-sm";

  return (
    <div className="text-right">
      {hasTon && <div className={cn(amountClass, pnlClassNameFromNumber(ton))}>{formatTonAmount(ton)}</div>}
      {hasUsd && (
        <div className={cn(amountClass, hasTon && "mt-0.5", pnlClassNameFromNumber(usd))}>{formatUsd(usd)}</div>
      )}
      {hasPercent && (
        <div className="mt-0.5 space-y-0.5 text-xs tabular-nums">
          {pctTonText && (
            <div className={pnlToneClassName(pnlToneFromNumber(percentTon ?? null))}>{pctTonText} TON</div>
          )}
          {pctUsdText && (
            <div className={pnlToneClassName(pnlToneFromNumber(percentUsd ?? null))}>{pctUsdText} USD</div>
          )}
        </div>
      )}
    </div>
  );
}
