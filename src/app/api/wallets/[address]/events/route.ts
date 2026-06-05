import { NextResponse } from "next/server";
import { loadWalletEventsPage, parseWalletAddressParam } from "@/modules/wallet/api/wallet-api.handlers";
import { parsePageParam } from "@/modules/wallet/domain/wallet-page.utils";
import { parseWalletHistoryFilters } from "@/shared/lib/wallet-route.utils";
import { serializeForJson } from "@/shared/infrastructure/sync/serialize-json";

interface RouteContext {
  params: Promise<{ address: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { address: addressParam } = await context.params;
    const address = parseWalletAddressParam(addressParam);
    const { searchParams } = new URL(request.url);
    const page = parsePageParam(searchParams.get("page") ?? undefined);
    const filters = parseWalletHistoryFilters({
      type: searchParams.get("type") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      direction: searchParams.get("direction") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      swaps: searchParams.get("swaps") ?? undefined,
    });
    const data = await loadWalletEventsPage(address, page, filters);

    return NextResponse.json(serializeForJson(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid wallet address";
    return NextResponse.json({ message }, { status: 400 });
  }
}
