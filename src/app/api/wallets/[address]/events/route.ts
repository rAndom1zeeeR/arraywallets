import { NextResponse } from "next/server";
import { loadWalletEventsPage, parseWalletAddressParam } from "@/features/sync-events/api/wallet-api.handlers";
import { parsePageParam } from "@/features/sync-events/model/wallet-page.utils";
import { serializeForJson } from "@/shared/lib/serialize-json";

interface RouteContext {
  params: Promise<{ address: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { address: addressParam } = await context.params;
    const address = parseWalletAddressParam(addressParam);
    const { searchParams } = new URL(request.url);
    const page = parsePageParam(searchParams.get("page") ?? undefined);
    const swapsOnly = searchParams.get("swaps") === "1";
    const data = await loadWalletEventsPage(address, page, swapsOnly);

    return NextResponse.json(serializeForJson(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid wallet address";
    return NextResponse.json({ message }, { status: 400 });
  }
}
