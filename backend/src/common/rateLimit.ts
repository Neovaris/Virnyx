import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

/**
 * Simple in-memory rate limiter for Fastify
 * Stores request counts by IP address
 * Can be extended to use Redis for distributed systems
 */
class RateLimiterStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up stale entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  isLimited(
    key: string,
    maxRequests: number,
    windowMs: number
  ): { limited: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetTime < now) {
      // Create new entry
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { limited: false, remaining: maxRequests - 1, resetTime: now + windowMs };
    }

    if (entry.count >= maxRequests) {
      return { limited: true, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    return { limited: false, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
  }
}

// Separate store instances for different limits
const globalStore = new RateLimiterStore();
const authStore = new RateLimiterStore();

/**
 * Create a rate limit middleware with custom store
 */
export function createRateLimitMiddleware(maxRequests: number, windowMs: number, store: RateLimiterStore) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Get client IP
    const clientIp = request.ip;
    const key = `${clientIp}:${request.url}`;

    // Check rate limit
    const { limited, remaining, resetTime } = store.isLimited(key, maxRequests, windowMs);

    // Set response headers
    reply.header("RateLimit-Limit", maxRequests);
    reply.header("RateLimit-Remaining", Math.max(0, remaining));
    reply.header("RateLimit-Reset", resetTime);

    if (limited) {
      return reply.code(429).send({
        statusCode: 429,
        error: "Too Many Requests",
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
      });
    }
  };
}

/**
 * Configure global rate limiting for the app
 */
export async function configureRateLimit(app: FastifyInstance) {
  // Add hook for default rate limiting on all requests
  // But skip for auth endpoints as they have their own limiter
  app.addHook("preHandler", (request: FastifyRequest, reply: FastifyReply, done) => {
    if (request.url.startsWith("/auth/")) {
      // Skip global rate limit for auth endpoints
      done();
      return;
    }
    return createRateLimitMiddleware(100, 15 * 60 * 1000, globalStore)(request, reply);
  });
}

/**
 * Get rate limiting middleware for auth endpoints
 */
export function getAuthRateLimiter() {
  return createRateLimitMiddleware(5, 15 * 60 * 1000, authStore); // 5 per 15 minutes
}
