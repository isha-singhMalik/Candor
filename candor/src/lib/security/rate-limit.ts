/**
 * Fixed-window limiter.
 *  - Local/dev: in-memory (per server instance).
 *  - Production: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN and the counter is shared
 *    across all serverless instances. If Redis is unreachable it falls back to the in-memory limiter.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfter: number } {
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  b.count += 1;
  return b.count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
}

export async function rateLimitShared(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfter: number }> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return rateLimit(key, limit, windowMs);
  try {
    const now = Date.now();
    const bucket = Math.floor(now / windowMs);
    const k = `candor:rl:${key}:${bucket}`;
    const res = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([["INCR", k], ["PEXPIRE", k, windowMs]]),
    });
    if (!res.ok) throw new Error(`redis ${res.status}`);
    const count = Number((await res.json())?.[0]?.result);
    if (!Number.isFinite(count)) throw new Error("bad redis reply");
    return count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.max(1, Math.ceil(((bucket + 1) * windowMs - now) / 1000)) };
  } catch {
    return rateLimit(key, limit, windowMs);
  }
}
export const _resetRateLimit = () => buckets.clear();
