import Link from "next/link";
import { Suspense } from "react";
import { AnalyzeWalletForm } from "@/modules/wallet/presentation/components/AnalyzeWalletForm";
import { WalletSyncStatusBadge } from "@/modules/wallet/presentation/components/WalletSyncStatusBadge";
import type { AnalyzedWalletListItem } from "@/modules/wallet/domain/wallets-list.types";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { WalletsMobileList } from "@/modules/wallet/presentation/components/WalletsMobileList";
import { ResponsiveDataTable } from "@/shared/presentation/components/data-table/responsive-data-table";
import { dataTableStyles, pageStyles } from "@/shared/presentation/components/data-table/data-table.styles";

export interface WalletsListPageProps {
  wallets: AnalyzedWalletListItem[];
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }

  const date = new Date(iso);
  if (date.getTime() === 0) {
    return "—";
  }

  return date.toLocaleString();
}

function WalletsTable({ wallets }: { wallets: AnalyzedWalletListItem[] }) {
  if (wallets.length === 0) {
    return (
      <div className={pageStyles.section}>
        <p className="text-sm text-muted-foreground">
          Пока нет проанализированных кошельков. Вставь адрес выше и нажми «Анализировать».
        </p>
      </div>
    );
  }

  return (
    <section className={pageStyles.section}>
      <div className="mb-4">
        <h2 className={pageStyles.sectionTitle}>Проанализированные кошельки</h2>
        <p className={pageStyles.sectionSubtitle}>{wallets.length} в базе</p>
      </div>

      <ResponsiveDataTable
        mobile={<WalletsMobileList wallets={wallets} />}
        desktop={
          <div className={dataTableStyles.scroll}>
            <table className={dataTableStyles.table}>
          <thead className={dataTableStyles.thead}>
            <tr className={dataTableStyles.headerRow}>
              <th className={dataTableStyles.headerCell}>Адрес</th>
              <th className={dataTableStyles.headerCell}>Статус</th>
              <th className={dataTableStyles.headerCell}>Events</th>
              <th className={dataTableStyles.headerCell}>Actions</th>
              <th className={`${dataTableStyles.headerCell} hidden md:table-cell`}>Обновлён</th>
              <th className={`${dataTableStyles.headerCell} ${dataTableStyles.headerCellRight}`}> </th>
            </tr>
          </thead>
          <tbody className={dataTableStyles.tbody}>
            {wallets.map(wallet => (
              <tr key={wallet.rawAddress} className={dataTableStyles.bodyRow}>
                <td className={dataTableStyles.bodyCell}>
                  <Link
                    href={getWalletPagePath(wallet.address)}
                    className="block max-w-xs truncate font-mono text-sm text-primary hover:underline sm:max-w-md"
                    title={wallet.address}
                  >
                    {wallet.address}
                  </Link>
                  {wallet.error && (
                    <p className="mt-1 max-w-md truncate text-xs text-loss" title={wallet.error}>
                      {wallet.error}
                    </p>
                  )}
                </td>
                <td className={dataTableStyles.bodyCell}>
                  <WalletSyncStatusBadge status={wallet.status} />
                </td>
                <td className={dataTableStyles.bodyCell}>{wallet.eventsCount}</td>
                <td className={dataTableStyles.bodyCell}>{wallet.actionsCount}</td>
                <td className={`${dataTableStyles.bodyCell} hidden md:table-cell`}>
                  <time className="text-sm text-muted-foreground">{formatDateTime(wallet.lastUpdated)}</time>
                </td>
                <td className={`${dataTableStyles.bodyCell} ${dataTableStyles.bodyCellRight}`}>
                  <Link
                    href={getWalletPagePath(wallet.address)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Открыть
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
            </table>
          </div>
        }
      />
    </section>
  );
}

export function WalletsListPage({ wallets }: WalletsListPageProps) {
  return (
    <main className={pageStyles.main}>
      <div className="mb-6">
        <h1 className={pageStyles.pageTitle}>Кошельки</h1>
        <p className="mt-1 text-sm text-muted-foreground">Список проанализированных TON-кошельков</p>
      </div>

      <section className={`${pageStyles.infoCard} mb-6`}>
        <Suspense fallback={<div className="h-20 animate-pulse rounded-lg bg-secondary" />}>
          <AnalyzeWalletForm />
        </Suspense>
      </section>

      <WalletsTable wallets={wallets} />
    </main>
  );
}
