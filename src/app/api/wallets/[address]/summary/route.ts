import { NextResponse } from "next/server";
import { loadWalletSummary, parseWalletAddressParam } from "@/features/sync-events/api/wallet-api.handlers";
import { serializeForJson } from "@/shared/lib/serialize-json";

interface RouteContext {
  params: Promise<{ address: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { address: addressParam } = await context.params;
    const address = parseWalletAddressParam(addressParam);
    const data = await loadWalletSummary(address);

    return NextResponse.json(serializeForJson(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid wallet address";
    return NextResponse.json({ message }, { status: 400 });
  }
}
