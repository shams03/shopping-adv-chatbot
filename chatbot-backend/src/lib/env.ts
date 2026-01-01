import { config } from "dotenv";

// Load environment variables from .env file
config();

// Validate required environment variables
const requiredEnvVars = {
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error("Missing required environment variables:", missingVars.join(", "));
  console.error("Please ensure these are set in your .env file or environment.");
  process.exit(1);
}

export const appConfig = {
  databaseUrl: process.env.DATABASE_URL!,
  geminiApiKey: process.env.GEMINI_API_KEY!,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  nodeEnv: process.env.NODE_ENV || "development",
};
