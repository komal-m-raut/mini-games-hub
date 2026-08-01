import { NextRequest } from 'next/server';

/**
 * Minimal in-memory fixed-window rate limiter, keyed by client IP.
 *
 * IMPORTANT — what this does and does not protect against:
 * - It is per-process state, so it resets on cold start and does NOT share
 *   state across serverless instances / regions. On a multi-instance deploy
 *   each instance enforces its own independent window, so the *effective*
 *   limit is roughly `limit * instanceCount`.
 * - It raises the bar for casual, single-source abuse (a buggy client loop,
 *   a bored script). It is not a real defence against a determined attacker,
 *   who can simply rotate IPs or spread requests across instances.
 * - A proper fix is a shared counter (e.g. Redis INCR + EXPIRE via the same
 *   Upstash REST client used for scores/stats).
 */

interface Window {
  count: number;
  resetAt: number;
}

// gameId/board or route path -> ip -> window. Kept in one map per limiter
// instance (call `createRateLimiter` once per route, module-level).
export function createRateLimiter(limit: number, windowMs: number) {
  const windows = new Map<string, Window>();

  return function check(ip: string): { limited: boolean; retryAfterSeconds: number } {
    const now = Date.now();

    // Evict expired windows on every call so the map can't grow unboundedly
    // under a distributed/spoofed-IP attack. Cheap since most entries expire
    // quickly relative to traffic volume.
    for (const [key, w] of windows) {
      if (w.resetAt <= now) windows.delete(key);
    }

    const existing = windows.get(ip);
    if (!existing || existing.resetAt <= now) {
      windows.set(ip, { count: 1, resetAt: now + windowMs });
      return { limited: false, retryAfterSeconds: 0 };
    }

    existing.count += 1;
    if (existing.count > limit) {
      return { limited: true, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
    }
    return { limited: false, retryAfterSeconds: 0 };
  };
}

/**
 * Best-effort client IP for rate-limiting purposes. NextRequest dropped its
 * built-in `.ip` in v15, so we read the proxy headers directly: standard
 * `x-forwarded-for` (may contain a comma-separated chain — the first entry
 * is the original client), falling back to `x-real-ip`. Neither header is
 * trustworthy against a spoofing client with no proxy in front of it, but
 * that's fine here — this limiter is a soft speed bump, not a security
 * boundary (see comment above).
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: 'Too many requests, please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}
