import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

import { serverEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Prisma ORM v7 requires a driver adapter. PrismaPg works with standard
  // `postgres://` connection strings (Neon, RDS, local Postgres, etc.).
  const adapter = new PrismaPg({ connectionString: serverEnv.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Cache the single client/pool across ALL environments (not just dev). If the
// global is only populated in non-production, production code paths re-create a
// fresh PrismaClient (and a fresh PrismaPg/pg pool, max 10 connections each) on
// every module load. With a direct, non-pooled Neon connection, that multiplies
// open connections until Neon's budget is exhausted, so transactions can no
// longer start within Prisma's default `maxWait` -> "Unable to start a
// transaction in the given time."
globalForPrisma.prisma = prisma;
