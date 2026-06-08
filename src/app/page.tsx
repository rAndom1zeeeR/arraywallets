import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HomePage } from "@/modules/home/presentation/pages/HomePage";
import { getWalletPagePath, parseWalletHistoryFilters } from "@/shared/lib/wallet-route.utils";
import { parsePageParam } from "@/modules/wallet/domain/wallet-page.utils";

export const metadata: Metadata = {
  title: "ArrayWallets — TON wallet explorer & analytics",
  description:
    "Sync TON wallet events from TonAPI, track jetton PnL, analyze swaps, and execute cross-chain trades via Omnistone.",
};

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Root URL shows the landing page; legacy `/?address=...` still redirects to `/wallets/[address]`.
 */
export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const addressParam = typeof params.address === "string" ? params.address : undefined;

  if (addressParam) {
    const page = parsePageParam(params.page);
    const historyFilters = parseWalletHistoryFilters(params);

    redirect(
      getWalletPagePath(addressParam, {
        tab: "events",
        page: page > 1 ? page : undefined,
        type: historyFilters.actionType,
        status: historyFilters.actionStatus,
        direction: historyFilters.direction,
        from: historyFilters.dateFrom ?? undefined,
        to: historyFilters.dateTo ?? undefined,
      }),
    );
  }

  return <HomePage />;
}
