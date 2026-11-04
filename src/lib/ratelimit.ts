/** A fixed-window counter per key, in memory. One server instance is enough for this business. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(limit: number, windowMs: number, now: () => number = Date.now) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** True while the key is within its limit. Each call counts as one attempt. */
  allow(key: string): boolean {
    const time = this.now();
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) if (v.resetAt <= time) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= time) {
      this.hits.set(key, { count: 1, resetAt: time + this.windowMs });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }
}
