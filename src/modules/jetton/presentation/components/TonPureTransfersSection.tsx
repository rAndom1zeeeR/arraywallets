"use client";

import type { TonTransferPnlSummary } from "@/modules/jetton/domain/ton-transfer-pnl.utils";
import { TonPureTransfersTable } from "@/modules/jetton/presentation/components/TonPureTransfersTable";
import { pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";

interface TonPureTransfersSectionProps {
  transfers: TonTransferPnlSummary;
}

export function TonPureTransfersSection({ transfers }: TonPureTransfersSectionProps) {
  if (transfers.items.length === 0) {
    return null;
  }

  const count = transfers.items.length;
  const countLabel = count === 1 ? "transfer" : "transfers";

  return (
    <section className={pageStyles.section}>
      <h2 className={pageStyles.sectionTitle}>Pure TON transfers</h2>
      <p className={pageStyles.sectionSubtitle}>
        Deposits and withdrawals without swaps or contracts · {count} {countLabel}
      </p>

      <TonPureTransfersTable items={transfers.items} />
    </section>
  );
}
