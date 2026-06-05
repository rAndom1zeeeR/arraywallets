import { NextResponse } from "next/server";
import { getWalletAccountBalances } from "@/modules/wallet/application/wallet-account-balances.service";
import { parseWalletAddressParam } from "@/modules/wallet/api/wallet-api.handlers";
import { serializeForJson } from "@/shared/infrastructure/sync/serialize-json";

interface RouteContext {
  params: Promise<{ address: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { address: addressParam } = await context.params;
    const address = parseWalletAddressParam(addressParam);
    const data = await getWalletAccountBalances(address);

    return NextResponse.json(serializeForJson(data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load wallet balances";
    return NextResponse.json({ message }, { status: 400 });
  }
}
