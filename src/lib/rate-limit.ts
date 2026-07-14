/**
 * Best-effort in-memory rate limiter for password-checking endpoints
 * (login, void approval, owner-unlock).
 *
 * NOTE: state lives in the process, so on Vercel each warm lambda has its own
 * counters and a determined attacker hitting fresh instances can dilute it. It
 * is defense-in-depth that raises the cost of brute force / credential stuffing;
 * for hard enforcement move this to a shared store (e.g. Upstash Redis). Login
 * is keyed by username (not IP) so one shop behind a single NAT'd connection
 * can't lock each other out.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

/**
 * Count one attempt against `key`. Returns `ok: false` once `limit` attempts
 * happen within `windowMs`. Call `rateLimitReset(key)` on success so legitimate
 * users never accumulate toward the cap.
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();

  // Opportunistic cleanup so the map can't grow without bound.
  if (store.size > 5000) {
    for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
  }

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (bucket.count >= opts.limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

/** Clear the counter for `key` (call after a successful authentication). */
export function rateLimitReset(key: string): void {
  store.delete(key);
}
