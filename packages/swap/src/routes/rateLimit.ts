export class RateLimiter {
  private state = new Map<string, { count: number; windowStart: number }>();

  private cleanupTimer: NodeJS.Timeout;

  constructor(private config: { windowMs: number; maxRequests: number }) {
    this.cleanupTimer = setInterval(() => this.cleanup(), config.windowMs * 5).unref();
  }

  check(ip: string): number | null {
    const now = Date.now();
    const { windowMs, maxRequests } = this.config;

    let entry = this.state.get(ip);

    if (!entry) {
      entry = { count: 0, windowStart: now };
      this.state.set(ip, entry);
    }

    // Reset window if it has elapsed
    if (now - entry.windowStart >= windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
      return retryAfter;
    }

    entry.count += 1;
    return null;
  }

  dispose(): void {
    clearInterval(this.cleanupTimer);
    this.state.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const { windowMs } = this.config;

    for (const [ip, entry] of this.state) {
      if (now - entry.windowStart >= windowMs) {
        this.state.delete(ip);
      }
    }
  }
}
