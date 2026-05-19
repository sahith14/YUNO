// Single re-export point for the Prisma client.
// Apps should `import { prisma } from "@yuno/db"`.

import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __yunoPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  globalThis.__yunoPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error", "warn"]
        : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__yunoPrisma = prisma;
}

export * from "@prisma/client";
