import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter } from '../rateLimit.js';

describe(RateLimiter, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });

    for (let i = 0; i < 5; i += 1) {
      expect(limiter.check('1.2.3.4')).toBe(null);
    }

    limiter.dispose();
  });

  it('blocks requests exceeding the limit', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3 });

    for (let i = 0; i < 3; i += 1) {
      expect(limiter.check('1.2.3.4')).toBe(null);
    }
    expect(limiter.check('1.2.3.4')).toBe(60);

    limiter.dispose();
  });

  it('tracks different IPs independently', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2 });

    expect(limiter.check('1.1.1.1')).toBe(null);
    expect(limiter.check('1.1.1.1')).toBe(null);
    expect(limiter.check('1.1.1.1')).toBe(60);

    expect(limiter.check('2.2.2.2')).toBe(null);
    expect(limiter.check('2.2.2.2')).toBe(null);
    expect(limiter.check('2.2.2.2')).toBe(60);

    limiter.dispose();
  });

  it('restores full quota after window reset', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3 });

    for (let i = 0; i < 3; i += 1) {
      limiter.check('1.2.3.4');
    }
    expect(limiter.check('1.2.3.4')).toBe(60);

    // Advance past the full window
    vi.advanceTimersByTime(60_000);

    // Fixed window: full quota is restored immediately
    for (let i = 0; i < 3; i += 1) {
      expect(limiter.check('1.2.3.4')).toBe(null);
    }
    expect(limiter.check('1.2.3.4')).toBe(60);

    limiter.dispose();
  });

  it('returns retryAfter seconds remaining in the window', () => {
    const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2 });

    limiter.check('1.2.3.4');
    limiter.check('1.2.3.4');

    // Advance 20 seconds into the window
    vi.advanceTimersByTime(20_000);

    const result = limiter.check('1.2.3.4');
    // 60s window, 20s elapsed => 40s remaining
    expect(result).toBe(40);

    limiter.dispose();
  });

  it('cleans up stale entries', () => {
    const limiter = new RateLimiter({ windowMs: 10_000, maxRequests: 5 });

    limiter.check('1.2.3.4');
    limiter.check('5.6.7.8');

    // Advance past cleanup interval (5 * windowMs = 50_000)
    vi.advanceTimersByTime(50_000);

    // After cleanup, entries are removed - new requests get fresh quota
    for (let i = 0; i < 5; i += 1) {
      expect(limiter.check('1.2.3.4')).toBe(null);
    }

    limiter.dispose();
  });
});
