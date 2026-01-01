import Redis from "ioredis";
import { appConfig } from "./env";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    console.log(`Connecting to Redis at ${appConfig.redisUrl}...`);
    
    redisClient = new Redis(appConfig.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      connectTimeout: 5000,
      lazyConnect: false,
    });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected successfully");
    });

    redisClient.on("ready", () => {
      console.log("Redis ready to accept commands");
    });

    redisClient.on("close", () => {
      console.log("Redis connection closed");
    });

    redisClient.on("reconnecting", () => {
      console.log("Redis reconnecting...");
    });
  }

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

