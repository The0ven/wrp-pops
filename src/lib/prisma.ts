import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient(
    process.env.DATABASE_URL
      ? { datasources: { db: { url: process.env.DATABASE_URL } } }
      : undefined,
  );
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export { prisma };
