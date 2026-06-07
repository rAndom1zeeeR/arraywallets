"use client";

import { ArrowLeftRight, ArrowUpRight } from "lucide-react";
import {
  formatMoneyTonFromNanoton,
  formatTonAmount,
} from "@/modules/jetton/domain/money-format.utils";
import { pnlClassNameFromBigint, pnlClassNameFromNumber } from "@/modules/jetton/domain/pnl-display.utils";
import type { TonPnlWithTransfers } from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import type { AssetPnlFormatted } from "@/modules/swap/domain/swap-pnl.utils";
import { explorerStyles } from "@/shared/presentation/components/explorer/explorer.styles";
import { cn } from "@/shared/lib/utils";

interface WalletPnlSummaryCardsProps {
  flowPnl: AssetPnlFormatted;
  tonPnlWithTransfers: TonPnlWithTransfers;
}

function formatFlowTon(raw: bigint): string {
  return formatMoneyTonFromNanoton(raw);
}

function formatSignedFlowTon(raw: bigint): string {
  const base = formatFlowTon(raw);
  if (raw > 0n && !base.startsWith("+")) {
    return `+${base}`;
  }
  return base;
}

function formatSignedTonNumber(value: number): string {
  const base = formatTonAmount(value) ?? "0 TON";
  if (value > 0 && !base.startsWith("+")) {
    return `+${base}`;
  }
  return base;
}

interface SwapFlowRowProps {
  label: string;
  value: string;
  valueClassName?: string;
}

function SwapFlowRow({ label, value, valueClassName }: SwapFlowRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", valueClassName)}>{value}</span>
    </div>
  );
}

export function WalletPnlSummaryCards({ flowPnl, tonPnlWithTransfers }: WalletPnlSummaryCardsProps) {
  const hasFlow = flowPnl.spentRaw > 0n || flowPnl.receivedRaw > 0n;
  const withdrawnLabel = formatTonAmount(tonPnlWithTransfers.withdrawnTon) ?? "0 TON";
  const receivedLabel = formatTonAmount(tonPnlWithTransfers.depositedTon) ?? "0 TON";
  const netTransferTon =
    tonPnlWithTransfers.depositedTon - tonPnlWithTransfers.withdrawnTon;
  const netFlowClass = pnlClassNameFromBigint(flowPnl.netRaw);
  const netTransferClass = pnlClassNameFromNumber(netTransferTon);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className={explorerStyles.card} aria-label="Swap flow">
        <div className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden />
            Swap Flow
          </div>
          <p className="mt-1 text-xs text-muted-foreground">TON spent / received on swaps</p>

          {hasFlow ? (
            <div className="mt-2 divide-y divide-border">
              <SwapFlowRow label="Spent" value={formatFlowTon(flowPnl.spentRaw)} valueClassName="text-loss" />
              <SwapFlowRow
                label="Received"
                value={formatFlowTon(flowPnl.receivedRaw)}
                valueClassName="text-profit"
              />
              <SwapFlowRow
                label="Net"
                value={formatSignedFlowTon(flowPnl.netRaw)}
                valueClassName={cn("text-base font-bold", netFlowClass)}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No TON swap flow for this wallet.</p>
          )}
        </div>
      </section>

      <section className={explorerStyles.card} aria-label="Transfer flow">
        <div className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
            Transfer Flow
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Pure TON in / out (excl. swaps)</p>

          <div className="mt-2 divide-y divide-border">
            <SwapFlowRow
              label="TON withdrawn"
              value={withdrawnLabel}
              valueClassName={
                tonPnlWithTransfers.withdrawnTon > 0 ? "text-loss" : "text-muted-foreground"
              }
            />
            <SwapFlowRow
              label="TON received"
              value={receivedLabel}
              valueClassName={
                tonPnlWithTransfers.depositedTon > 0 ? "text-profit" : "text-muted-foreground"
              }
            />
            <SwapFlowRow
              label="Net"
              value={formatSignedTonNumber(netTransferTon)}
              valueClassName={cn("text-base font-bold", netTransferClass)}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
