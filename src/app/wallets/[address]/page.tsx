import { Suspense } from "react";
import { Address } from "@ton/core";
import { WalletTransactionsPage } from "@/modules/wallet/presentation/pages/WalletTransactionsPage";
import { normalizeWalletAddress } from "@/shared/lib/ton/ton-address";
import { decodeWalletAddressParam } from "@/shared/lib/wallet-route.utils";

export const dynamic = "force-dynamic";

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
      <main className="min-h-screen bg-background px-4 py-6 sm:px-8">
        <h1 className="mb-4 text-2xl font-bold text-foreground">TON Wallets</h1>
        <div className="rounded-xl border border-loss/30 bg-loss/10 px-4 py-3 text-loss">
          Invalid TON address: {decodedAddress}
        </div>
      </main>
    );
  }

  const addressString = normalizeWalletAddress(address.toString());
  const autoStartSync = query.sync === "1";

  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
          Loading wallet…
        </main>
      }
    >
      <WalletTransactionsPage address={addressString} autoStartSync={autoStartSync} />
    </Suspense>
  );
}
