/**
 * Rate Limiting with Upstash Redis
 *
 * Protects API endpoints from abuse and DoS attacks
 */

import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limit a request based on identifier (user ID, IP address, etc.)
 *
 * @param identifier - Unique identifier for the requester (e.g., user ID)
 * @param limit - Maximum number of requests allowed
 * @param window - Time window in seconds
 * @returns Rate limit result
 */
export async function rateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:${identifier}`;

  try {
    // Use Redis INCR to atomically increment counter
    const current = await redis.incr(key);

    // Set expiration on first request
    if (current === 1) {
      await redis.expire(key, window);
    }

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(key);
    const reset = Date.now() + (ttl * 1000);

    // Check if limit exceeded
    const success = current <= limit;
    const remaining = Math.max(0, limit - current);

    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    // On Redis error, allow the request (fail open)
    console.error('Rate limit error:', error);
    return {
      success: true,
      limit,
      remaining: limit,
      reset: Date.now() + (window * 1000),
    };
  }
}

/**
 * Sliding window rate limiter (more accurate)
 *
 * @param identifier - Unique identifier for the requester
 * @param limit - Maximum number of requests allowed
 * @param window - Time window in seconds
 */
export async function rateLimitSliding(
  identifier: string,
  limit: number = 10,
  window: number = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:sliding:${identifier}`;
  const now = Date.now();
  const windowMs = window * 1000;

  try {
    // Remove old entries
    await redis.zremrangebyscore(key, 0, now - windowMs);

    // Count requests in current window
    const current = await redis.zcard(key);

    if (current >= limit) {
      const oldestEntry = await redis.zrange(key, 0, 0, { withScores: true });
      const resetTime = oldestEntry[1] ? Number(oldestEntry[1]) + windowMs : now + windowMs;

      return {
        success: false,
        limit,
        remaining: 0,
        reset: resetTime,
      };
    }

    // Add current request
    await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    await redis.expire(key, window);

    return {
      success: true,
      limit,
      remaining: limit - current - 1,
      reset: now + windowMs,
    };
  } catch (error) {
    console.error('Sliding rate limit error:', error);
    return {
      success: true,
      limit,
      remaining: limit,
      reset: now + windowMs,
    };
  }
}
