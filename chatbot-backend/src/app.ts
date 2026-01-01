// Load environment variables FIRST before any other imports
import "./lib/env";
import express from "express";
import cors from "cors";
import router from "./routes/chat.route";
import { errorHandler } from "./middleware/errorHandler";
import { getRedisClient } from "./lib/redis";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "chatbot-api" });
});

// Health check with Redis status
app.get("/health", async (req, res) => {
  try {
    const redis = getRedisClient();
    
    // Test Redis connection
    const startTime = Date.now();
    await redis.ping();
    const latency = Date.now() - startTime;
    
    // Get Redis info
    const info = await redis.info("server");
    const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1] || "unknown";
    
    res.json({
      status: "ok",
      service: "chatbot-api",
      redis: {
        connected: true,
        latency: `${latency}ms`,
        version: redisVersion,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      service: "chatbot-api",
      redis: {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// Debug endpoint to view Redis data (development only)
app.get("/debug/redis", async (req, res) => {
  try {
    const redis = getRedisClient();
    
    // Get all rate limit keys
    const allKeys = await redis.keys("rate_limit:*");
    const data: Record<string, any> = {};
    
    for (const key of allKeys) {
      const value = await redis.get(key);
      const ttl = await redis.ttl(key);
      data[key] = {
        value,
        ttl,
        expiresIn: ttl > 0 ? `${ttl} seconds` : "no expiry",
        willExpireAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : "never",
      };
    }
    
    // Get all keys (for debugging)
    const totalKeys = await redis.dbsize();
    
    res.json({
      totalKeysInRedis: totalKeys,
      rateLimitKeys: allKeys.length,
      keys: data,
      note: "Keys expire after 60 seconds. Make a request to see new keys!",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch Redis data",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// API routes
app.use("/api/v1", router);

// Error handler (must be last)
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Chatbot API listening on port ${port}`);
});
