import { Suspense } from "react";
import { accountEventFromJson } from "@/entities/chain-events/chain-raw-event.dto";
import { findChainRawEventsPage } from "@/entities/chain-events/chain-raw-event.repository";
import {
  CHAIN_EVENTS_PAGE_SIZE,
  DEFAULT_WALLET_FRIENDLY,
} from "@/entities/chain-events/wallet.constants";
import { SyncWalletButton } from "@/features/wallet-sync/ui/SyncWalletButton";
import { TransactionsPagination } from "@/widgets/wallet-transactions/TransactionsPagination";
import { WalletTransactionsTable } from "@/widgets/wallet-transactions/WalletTransactionsTable";
import { toRawTonAddress } from "@/shared/lib/ton-address";

interface HomePageProps {
  searchParams: Promise<{ page?: string }>;
}

const parsePage = (value: string | undefined): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.floor(parsed);
};

export default async function Home({ searchParams }: HomePageProps) {
  const { page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const walletRaw = toRawTonAddress(DEFAULT_WALLET_FRIENDLY);

  const eventsPage = await findChainRawEventsPage(walletRaw, page, CHAIN_EVENTS_PAGE_SIZE);
  const events = eventsPage.items.map(row => accountEventFromJson(row.payload));
  const rowOffset = (eventsPage.page - 1) * eventsPage.pageSize;

  return (
    <main className="p-4">
      <h1 className="mb-4 text-2xl font-bold">TON Wallet Transactions</h1>

      <Suspense fallback={<p className="mb-4 text-sm text-gray-500">Загрузка…</p>}>
        <SyncWalletButton walletAddress={DEFAULT_WALLET_FRIENDLY} />
      </Suspense>

      {eventsPage.total === 0 ? (
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Нет событий. Нажми «Синхронизация».
        </p>
      ) : (
        <>
          <TransactionsPagination
            page={eventsPage.page}
            totalPages={eventsPage.totalPages}
            total={eventsPage.total}
            pageSize={eventsPage.pageSize}
          />
          <WalletTransactionsTable events={events} rowOffset={rowOffset} />
          <TransactionsPagination
            page={eventsPage.page}
            totalPages={eventsPage.totalPages}
            total={eventsPage.total}
            pageSize={eventsPage.pageSize}
          />
        </>
      )}
    </main>
  );
}
