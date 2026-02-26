import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 300_000,
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
