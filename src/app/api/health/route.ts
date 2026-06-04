import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe for Docker / Dokploy. Does not depend on TonAPI.
 * DB check is best-effort so the container can start before Postgres is reachable.
 */
export async function GET(): Promise<NextResponse> {
  const body: { status: string; db?: string } = { status: "ok" };

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ status: "error", db: "missing" }, { status: 503 });
  }

  try {
    const { prisma } = await import("@/shared/infrastructure/api/prisma");
    await prisma.$queryRaw`SELECT 1`;
    body.db = "connected";
  } catch {
    body.db = "unavailable";
  }

  return NextResponse.json(body);
}
