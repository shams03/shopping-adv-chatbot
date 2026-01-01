import { Request, Response, NextFunction } from "express";
import { getRedisClient } from "../lib/redis";

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  IP: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute per IP
  },
  SESSION: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 requests per minute per session
  },
};

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    (req.headers["x-real-ip"] as string) ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

/**
 * Rate limiting middleware
 * Applies both IP-based and session-based rate limiting
 */
export async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const redis = getRedisClient();
    const ip = getClientIp(req);
    const sessionId = (req.body?.sessionId as string) || "anonymous";

    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV === "development") {
      console.log(`[Rate Limiter] IP: ${ip}, SessionId: ${sessionId}`);
    }

    // IP-based rate limiting
    const ipKey = `rate_limit:ip:${ip}`;
    const ipCount = await redis.incr(ipKey);
    
    // Debug logging
    if (process.env.NODE_ENV === "development") {
      console.log(`[Rate Limiter] Created/Updated key: ${ipKey}, Count: ${ipCount}`);
    }
    
    if (ipCount === 1) {
      await redis.expire(ipKey, Math.ceil(RATE_LIMITS.IP.windowMs / 1000));
    }

    if (ipCount > RATE_LIMITS.IP.maxRequests) {
      res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded: ${RATE_LIMITS.IP.maxRequests} requests per minute per IP`,
        retryAfter: Math.ceil(RATE_LIMITS.IP.windowMs / 1000),
      });
      return;
    }

    // Session-based rate limiting (only if sessionId is provided)
    if (sessionId && sessionId !== "anonymous") {
      const sessionKey = `rate_limit:session:${sessionId}`;
      const sessionCount = await redis.incr(sessionKey);
      
      // Debug logging
      if (process.env.NODE_ENV === "development") {
        console.log(`[Rate Limiter] Created/Updated session key: ${sessionKey}, Count: ${sessionCount}`);
      }
      
      if (sessionCount === 1) {
        await redis.expire(
          sessionKey,
          Math.ceil(RATE_LIMITS.SESSION.windowMs / 1000)
        );
      }

      if (sessionCount > RATE_LIMITS.SESSION.maxRequests) {
        res.status(429).json({
          error: "Too many requests",
          message: `Rate limit exceeded: ${RATE_LIMITS.SESSION.maxRequests} requests per minute per session`,
          retryAfter: Math.ceil(RATE_LIMITS.SESSION.windowMs / 1000),
        });
        return;
      }
    }

    next();
  } catch (error) {
    // If Redis fails, allow the request (fail open for availability)
    console.error("Rate limiter error:", error);
    next();
  }
}

