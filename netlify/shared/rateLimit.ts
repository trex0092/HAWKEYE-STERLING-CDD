/**
 * Best-effort in-memory rate limiter for the serverless functions — Governance
 * Layer 3 (Security & Resilience). Caps requests per client IP within a fixed
 * window to blunt abuse / runaway loops against the Asana and AI endpoints.
 *
 * Kept outside `netlify/functions/` so it is bundled as a shared module, not
 * deployed as its own endpoint. Note: serverless instances are ephemeral, so the
 * counter resets on cold starts — this is a guardrail, not a hard quota. For a
 * durable limit, back it with a shared store (e.g. Netlify Blobs / Redis).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (for a Retry-After header). */
  retryAfter: number;
}

/**
 * Records a hit for `key` and reports whether it is within `limit` per
 * `windowMs`. Defaults: 20 requests / 60s.
 */
export function checkRateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

/** Derives a client key from the request's IP headers (Netlify / proxy aware). */
export function clientKey(req: Request): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
