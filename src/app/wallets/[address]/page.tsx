import { Suspense } from "react";
import { Address } from "@ton/core";
import { WalletTransactionsPage } from "@/modules/wallet/presentation/pages/WalletTransactionsPage";
import { parsePageParam } from "@/modules/wallet/domain/wallet-page.utils";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";
import { decodeWalletAddressParam, parseWalletTabParam } from "@/shared/lib/wallet-route.utils";

interface WalletPageProps {
  params: Promise<{ address: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WalletPage({ params, searchParams }: WalletPageProps) {
  const { address: addressParam } = await params;
  const query = await searchParams;
  const decodedAddress = decodeWalletAddressParam(addressParam);

  let address: Address;
  try {
    address = Address.parse(decodedAddress);
  } catch {
    return (
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-2xl font-bold text-foreground">TON Wallet Transactions</h1>
        <div className="rounded-lg border border-loss/30 bg-loss/10 px-4 py-3 text-loss">
          Invalid TON address: {decodedAddress}
        </div>
      </main>
    );
  }

  const addressString = normalizeWalletAddress(address.toString());
  const currentPage = parsePageParam(query.page);
  const activeTab = parseWalletTabParam(query.tab);
  const swapsOnly = query.swaps === "1";

  return (
    <Suspense fallback={<main className="mx-auto max-w-7xl px-4 py-6 text-sm text-muted-foreground">Loading wallet…</main>}>
      <WalletTransactionsPage
        address={addressString}
        activeTab={activeTab}
        currentPage={currentPage}
        swapsOnly={swapsOnly}
      />
    </Suspense>
  );
}
