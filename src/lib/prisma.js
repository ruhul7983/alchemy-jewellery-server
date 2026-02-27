/**
 * Prisma Client setup (Standard Implementation)
 */

require("dotenv").config();

// ✅ Change: Import from the standard @prisma/client package
const { PrismaClient } = require("@prisma/client");
const { logger } = require("../shared/utils/logger");

if (!process.env.DATABASE_URL) {
  throw new Error("❌ DATABASE_URL is not defined");
}

const prismaClientSingleton = () =>
  new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "error", emit: "stdout" },
      { level: "warn", emit: "stdout" },
    ],
  });

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = prismaClientSingleton();
} else {
  if (!global.__prisma) {
    global.__prisma = prismaClientSingleton();
  }
  prisma = global.__prisma;
}

if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug(`Query: ${e.query}`);
    logger.debug(`Duration: ${e.duration}ms`);
  });
}

module.exports = prisma;