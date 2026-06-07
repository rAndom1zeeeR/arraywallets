import { formatMoneyTonFromNanoton } from "@/modules/jetton/domain/money-format.utils";
import { cn } from "@/shared/lib/utils";

export const SWAP_JETTON_FLOW_SUBTITLE = "TON + USDT";

function hasCounterpartText(text: string): boolean {
  return text.trim() !== "" && text !== "—";
}

interface SwapJettonMergedFlowCellProps {
  tonNanoton: bigint;
  otherText: string;
  tone: "profit" | "loss";
  align?: "left" | "right";
}

export function SwapJettonMergedFlowCell({
  tonNanoton,
  otherText,
  tone,
  align = "right",
}: SwapJettonMergedFlowCellProps) {
  const tonText = formatMoneyTonFromNanoton(tonNanoton);
  const hasTon = tonNanoton > 0n;
  const hasOther = hasCounterpartText(otherText);

  if (!hasTon && !hasOther) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div
      className={cn(
        align === "right" ? "text-right" : "text-left",
        tone === "profit" ? "text-profit" : "text-loss"
      )}
    >
      {hasTon ? <div className="font-medium tabular-nums">{tonText}</div> : null}
      {hasOther ? (
        <div className={cn("tabular-nums", hasTon ? "mt-0.5 text-xs opacity-90" : "font-medium")}>
          {otherText}
        </div>
      ) : null}
    </div>
  );
}

interface SwapJettonMergedFlowMobileBlockProps {
  title: string;
  tonNanoton: bigint;
  otherText: string;
  tone: "profit" | "loss";
  align?: "left" | "right";
}

export function SwapJettonMergedFlowMobileBlock({
  title,
  tonNanoton,
  otherText,
  tone,
  align = "left",
}: SwapJettonMergedFlowMobileBlockProps) {
  const titleClass = tone === "profit" ? "text-profit" : "text-loss";

  return (
    <div className={align === "right" ? "text-right" : undefined}>
      <span className={titleClass}>{title}</span>
      <span className="ml-1 text-[10px] text-muted-foreground">{SWAP_JETTON_FLOW_SUBTITLE}</span>
      <div className="mt-0.5">
        <SwapJettonMergedFlowCell
          tonNanoton={tonNanoton}
          otherText={otherText}
          tone={tone}
          align={align}
        />
      </div>
    </div>
  );
}
