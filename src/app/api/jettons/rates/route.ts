import { after, NextResponse } from "next/server";
import { z } from "zod";
import type { JettonRatesResponse } from "@/modules/jetton/domain/jetton-rates.types";
import { loadJettonRatesFromDb, refreshStaleJettonPrices } from "@/modules/jetton/application/jetton-price.service";
import { toRawTonAddress } from "@/shared/lib/ton/ton-address";

const bodySchema = z.object({
  addresses: z.array(z.string().min(1)).max(200),
});

export async function POST(request: Request): Promise<NextResponse<JettonRatesResponse | { message: string }>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid addresses" }, { status: 400 });
  }

  const validAddresses = parsed.data.addresses
    .map(address => {
      try {
        return toRawTonAddress(address);
      } catch {
        return null;
      }
    })
    .filter((address): address is string => address !== null);

  const rates = await loadJettonRatesFromDb(validAddresses);

  if (validAddresses.length > 0) {
    after(() => refreshStaleJettonPrices(validAddresses));
  }

  return NextResponse.json({ rates });
}
