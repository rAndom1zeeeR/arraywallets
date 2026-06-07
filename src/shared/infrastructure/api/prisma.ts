import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/shared/infrastructure/api/prisma-client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Serverless-friendly pool cap — each warm lambda reuses one connection. */
const SERVERLESS_POOL_MAX = 1;

function resolveRuntimeConnectionString(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set");
  }

  const usesDirectPrismaHost =
    databaseUrl.includes("@db.prisma.io:") && !databaseUrl.includes("pooled.db.prisma.io");

  if (usesDirectPrismaHost) {
    throw new Error(
      "DATABASE_URL must use pooled.db.prisma.io for runtime (not db.prisma.io). " +
        "Prisma Console → Connect → copy the pooled string. " +
        "Use DIRECT_URL with db.prisma.io only in prisma.config.ts for migrations."
    );
  }

  return databaseUrl;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: resolveRuntimeConnectionString(),
      max: SERVERLESS_POOL_MAX,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 5_000,
    }),
    log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();
globalForPrisma.prisma = prisma;

export { prisma };
