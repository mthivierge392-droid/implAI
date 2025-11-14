import { Redis } from '@upstash/redis';
import { API_CONFIG } from './constants';

const redis = Redis.fromEnv();

export async function checkApiRateLimit(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const now = Date.now();
  const windowStart = now - API_CONFIG.RATE_LIMIT.WINDOW_MS;
  const resetAt = now + API_CONFIG.RATE_LIMIT.WINDOW_MS;
  const rateLimitKey = `rate_limit:${key}`;

  try {
    // Simple GET + INCR pattern (free tier compatible)
    const count = await redis.get<number>(rateLimitKey);
    const currentCount = count || 0;

    if (currentCount >= API_CONFIG.RATE_LIMIT.MAX_REQUESTS) {
      return { allowed: false, remaining: 0, resetAt };
    }

    // Use atomic INCR + EXPIRE
    const newCount = await redis.incr(rateLimitKey);
    
    // Set expiry only on first request
    if (newCount === 1) {
      await redis.expire(rateLimitKey, Math.ceil(API_CONFIG.RATE_LIMIT.WINDOW_MS / 1000));
    }

    return {
      allowed: true,
      remaining: Math.max(0, API_CONFIG.RATE_LIMIT.MAX_REQUESTS - newCount),
      resetAt,
    };
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Fail open: allow request if Redis fails
    return { allowed: true, remaining: API_CONFIG.RATE_LIMIT.MAX_REQUESTS, resetAt };
  }
}