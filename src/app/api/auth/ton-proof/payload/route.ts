import { NextResponse } from "next/server";
import { createTonProofPayload } from "@/modules/auth/application/create-ton-proof-payload.use-case";

/**
 * Returns a one-time payload for TON Connect `ton_proof` request.
 */
export async function GET() {
  const payload = await createTonProofPayload();

  return NextResponse.json({ payload });
}
