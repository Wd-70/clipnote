import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, number[]>>();

function getStore(name: string): Map<string, number[]> {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

export function createRateLimiter(name: string, config: RateLimitConfig) {
  const store = getStore(name);

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get existing timestamps and filter to window
      const timestamps = (store.get(identifier) || []).filter((t) => t > windowStart);

      if (timestamps.length >= config.maxRequests) {
        const resetAt = timestamps[0] + config.windowMs;
        return { allowed: false, remaining: 0, resetAt };
      }

      timestamps.push(now);
      store.set(identifier, timestamps);

      return {
        allowed: true,
        remaining: config.maxRequests - timestamps.length,
        resetAt: now + config.windowMs,
      };
    },
  };
}

// Pre-defined limiters
export const analyzeLimiter = createRateLimiter('analyze', { windowMs: 60_000, maxRequests: 5 });
export const chargePointsLimiter = createRateLimiter('chargePoints', { windowMs: 60_000, maxRequests: 3 });
export const shareViewLimiter = createRateLimiter('shareView', { windowMs: 60_000, maxRequests: 30 });
export const exportLimiter = createRateLimiter('export', { windowMs: 60_000, maxRequests: 5 });

/**
 * Returns a 429 response if rate limited, or null if allowed.
 */
export function rateLimitResponse(
  limiter: ReturnType<typeof createRateLimiter>,
  identifier: string,
): NextResponse | null {
  const result = limiter.check(identifier);
  if (!result.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }
  return null;
}

/**
 * Extract client IP from request for public endpoints.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
