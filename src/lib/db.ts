import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma único. En desarrollo se guarda en `globalThis` para que el
 * hot-reload de Next.js no abra conexiones nuevas en cada recompilación.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
