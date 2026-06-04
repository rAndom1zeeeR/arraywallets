import { NextResponse } from "next/server";
import { getAnalyzedWallets } from "@/modules/wallet/application/wallets-list.queries";

/**
 * Lists wallets that have sync state or stored events.
 */
export async function GET(): Promise<NextResponse> {
  const wallets = await getAnalyzedWallets();
  return NextResponse.json({ wallets });
}
