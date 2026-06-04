import { redirect } from "next/navigation";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { parsePageParam } from "@/modules/wallet/domain/wallet-page.utils";

const DEFAULT_ADDRESS = "EQD_VOCkZZxBqRlHgqVXzKpoW_29kR-S0t02VN4VxiDTr7Bl";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Legacy `/?address=...` URLs redirect to `/wallets/[address]`.
 */
export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const addressParam = typeof params.address === "string" ? params.address : DEFAULT_ADDRESS;
  const page = parsePageParam(params.page);
  const swapsOnly = params.swaps === "1";

  redirect(
    getWalletPagePath(addressParam, {
      tab: "events",
      page: page > 1 ? page : undefined,
      swaps: swapsOnly,
    })
  );
}
