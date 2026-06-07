import {
  formatCompactMoneyJetton,
  parseCompactMoneySubscript,
} from "@/modules/jetton/domain/money-format.utils";
import { cn } from "@/shared/lib/utils";

interface CompactMoneyAmountProps {
  value: string;
  className?: string;
}

/**
 * Renders compact money text; subscript zero count uses `<sub>` instead of `(n)`.
 */
export function CompactMoneyAmount({ value, className }: CompactMoneyAmountProps) {
  const parts = parseCompactMoneySubscript(value);

  if (!parts) {
    return <span className={className}>{value}</span>;
  }

  const { sign, zeroCount, significant, symbol } = parts;
  const accessibleValue = `${sign}0.0${"0".repeat(Number.parseInt(zeroCount, 10) + 1)}${significant}${
    symbol ? ` ${symbol}` : ""
  }`;

  return (
    <span className={className} title={accessibleValue} aria-label={accessibleValue}>
      {sign}0.0
      <sub className="bottom-0 text-[0.72em] font-semibold tabular-nums">{zeroCount}</sub>
      {significant}
      {symbol ? ` ${symbol}` : null}
    </span>
  );
}

interface CompactMoneyJettonAmountProps {
  raw: bigint | string | number | null | undefined;
  decimals: number;
  symbol?: string;
  className?: string;
}

/** Compact jetton/TON balance with subscript zero rendering. */
export function CompactMoneyJettonAmount({
  raw,
  decimals,
  symbol = "",
  className,
}: CompactMoneyJettonAmountProps) {
  return (
    <CompactMoneyAmount
      value={formatCompactMoneyJetton(raw, decimals, symbol)}
      className={cn("tabular-nums", className)}
    />
  );
}
