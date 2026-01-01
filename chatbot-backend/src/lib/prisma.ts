// @ts-ignore - PrismaClient is generated and available at runtime
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { appConfig } from "./env";

// Create connection pool
const pool = new Pool({
  connectionString: appConfig.databaseUrl,

  // CRITICAL SETTINGS
  max: 5, // small pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

const adapter = new PrismaPg(pool);

// Singleton Prisma Client instance
// This ensures only ONE Prisma client exists across the entire application
// All repositories and services import this same instance
let prismaInstance: PrismaClient | null = null;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({ adapter });
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();

(async () => {
  try {
    await prisma.$connect();
    console.log("Prisma initial connection OK");
  } catch (err) {
    console.error("Prisma failed to connect", err);
  }
})();
