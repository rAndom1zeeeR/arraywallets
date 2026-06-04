import { after, NextResponse } from "next/server";
import { loadWalletSummary, parseWalletAddressParam } from "@/modules/wallet/api/wallet-api.handlers";
import { refreshStaleJettonPrices } from "@/modules/jetton/application/jetton-price.service";
import { serializeForJson } from "@/shared/infrastructure/sync/serialize-json";

interface RouteContext {
  params: Promise<{ address: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { address: addressParam } = await context.params;
    const address = parseWalletAddressParam(addressParam);
    const data = await loadWalletSummary(address);

    const jettonAddresses = data.swapStats.byJetton.map(row => row.jetton.address);
    if (jettonAddresses.length > 0) {
      after(() => refreshStaleJettonPrices(jettonAddresses));
    }

    return NextResponse.json(serializeForJson(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid wallet address";
    return NextResponse.json({ message }, { status: 400 });
  }
}
