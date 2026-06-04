import { Suspense } from "react";
import { Address } from "@ton/core";
import { WalletTransactionsPage } from "@/widgets/wallet-transactions/ui/WalletTransactionsPage";
import { parsePageParam } from "@/features/sync-events/model/wallet-page.utils";
import { normalizeWalletAddress } from "@/shared/lib/ton-address";
import { decodeWalletAddressParam } from "@/shared/lib/wallet-route.utils";

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
      <main className="p-4">
        <h1 className="mb-4 text-2xl font-bold">TON Wallet Transactions</h1>
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          Invalid TON address: {decodedAddress}
        </div>
      </main>
    );
  }

  const addressString = normalizeWalletAddress(address.toString());
  const currentPage = parsePageParam(query.page);
  const swapsOnly = query.swaps === "1";

  return (
    <Suspense fallback={<main className="p-4 text-sm text-gray-500">Loading wallet…</main>}>
      <WalletTransactionsPage address={addressString} currentPage={currentPage} swapsOnly={swapsOnly} />
    </Suspense>
  );
}
