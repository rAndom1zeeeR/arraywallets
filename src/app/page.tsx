import { redirect } from "next/navigation";
import { getWalletPagePath } from "@/shared/lib/wallet-route.utils";
import { parsePageParam } from "@/modules/wallet/domain/wallet-page.utils";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Root URL opens `/wallets`; legacy `/?address=...` still redirects to `/wallets/[address]`.
 */
export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const addressParam = typeof params.address === "string" ? params.address : undefined;

  if (!addressParam) {
    redirect("/wallets");
  }

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
