import type { Metadata } from "next";
import { WalletsListPage } from "@/modules/wallet/presentation/pages/WalletsListPage";
import { getAnalyzedWallets } from "@/modules/wallet/application/wallets-list.queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wallets | TON Wallet",
  description: "List of analyzed TON wallets",
};

export default async function WalletsPage() {
  const wallets = await getAnalyzedWallets();

  return <WalletsListPage wallets={wallets} />;
}
