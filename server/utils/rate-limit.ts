/**
 * Simple in-memory rate limiter for API routes
 * In production, consider using Redis for distributed rate limiting
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Check if request is rate limited
 * @param key - Unique identifier (e.g., IP + route)
 * @param config - Rate limit configuration
 * @returns Object with limited status and remaining requests
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): {
  limited: boolean;
  remaining: number;
  resetIn: number;
} {
  const now = Date.now();
  const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;

  const entry = rateLimitStore.get(fullKey);

  if (!entry || entry.resetTime < now) {
    // Create new entry
    rateLimitStore.set(fullKey, {
      count: 1,
      resetTime: now + config.windowMs,
    });

    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(fullKey, entry);

  const limited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const resetIn = Math.max(0, entry.resetTime - now);

  return { limited, remaining, resetIn };
}

/**
 * Get client IP from H3 event
 */
export function getClientIP(event: Parameters<typeof getHeader>[0]): string {
  const forwardedFor = getHeader(event, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIP = getHeader(event, "x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Rate limit middleware for upload routes
 */
export const uploadRateLimit: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 uploads per minute
  keyPrefix: "upload",
};

/**
 * Rate limit middleware for auth routes
 */
export const authRateLimit: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 attempts per 15 minutes
  keyPrefix: "auth",
};

/**
 * Rate limit middleware for general API routes
 */
export const apiRateLimit: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyPrefix: "api",
};

/**
 * Apply rate limiting to an H3 event
 */
export function applyRateLimit(
  event: Parameters<typeof getHeader>[0],
  config: RateLimitConfig = apiRateLimit
): void {
  const clientIP = getClientIP(event);
  const result = checkRateLimit(clientIP, config);

  // Set rate limit headers
  setHeader(event, "X-RateLimit-Limit", config.maxRequests.toString());
  setHeader(event, "X-RateLimit-Remaining", result.remaining.toString());
  setHeader(
    event,
    "X-RateLimit-Reset",
    Math.ceil(result.resetIn / 1000).toString()
  );

  if (result.limited) {
    throw createError({
      statusCode: 429,
      statusMessage: "Too Many Requests",
      message: `Terlalu banyak permintaan. Silakan coba lagi dalam ${Math.ceil(
        result.resetIn / 1000
      )} detik.`,
    });
  }
}

/**
 * Sliding window rate limiter (more accurate for burst protection)
 */
interface SlidingWindowEntry {
  timestamps: number[];
}

const slidingWindowStore = new Map<string, SlidingWindowEntry>();

export function checkSlidingWindowRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): { limited: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = slidingWindowStore.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    slidingWindowStore.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  // Check if limited
  if (entry.timestamps.length >= maxRequests) {
    return {
      limited: true,
      remaining: 0,
    };
  }

  // Add current timestamp
  entry.timestamps.push(now);
  slidingWindowStore.set(key, entry);

  return {
    limited: false,
    remaining: maxRequests - entry.timestamps.length,
  };
}

// Cleanup sliding window store every 5 minutes
setInterval(() => {
  const now = Date.now();
  const maxWindow = 60 * 60 * 1000; // 1 hour max

  for (const [key, entry] of slidingWindowStore.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > now - maxWindow);
    if (entry.timestamps.length === 0) {
      slidingWindowStore.delete(key);
    }
  }
}, 5 * 60 * 1000);
