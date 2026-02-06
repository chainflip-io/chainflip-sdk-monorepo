import * as express from 'express';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRateLimiter, handleQuotingError } from '../common.js';

describe(handleQuotingError, () => {
  it('handles internal error message', () => {
    expect(() =>
      handleQuotingError(
        {} as unknown as express.Response,
        new Error('RPC error [-32603]: Internal error while processing request.', {}),
      ),
    ).toThrow('insufficient liquidity for requested amount');
  });
});

describe(createRateLimiter, () => {
  let middleware: ReturnType<typeof createRateLimiter> & {
    _cleanup?: ReturnType<typeof setInterval>;
  };

  afterEach(() => {
    if (middleware?._cleanup) clearInterval(middleware._cleanup);
  });

  const mockReq = (ip = '127.0.0.1') => ({ ip, headers: {} }) as unknown as express.Request;

  const mockRes = () => {
    const headers = new Map<string, string>();
    return {
      set: vi.fn((key: string, value: string) => headers.set(key, value)),
      _headers: headers,
    } as unknown as express.Response & { _headers: Map<string, string> };
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit', async () => {
    middleware = createRateLimiter({ windowMs: 60_000, maxRequests: 3 }) as typeof middleware;
    const next = vi.fn();

    await middleware(mockReq(), mockRes(), next);
    await middleware(mockReq(), mockRes(), next);
    await middleware(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(3);
    expect(next).toHaveBeenLastCalledWith();
  });

  it('returns 429 when limit is exceeded', async () => {
    middleware = createRateLimiter({ windowMs: 60_000, maxRequests: 2 }) as typeof middleware;
    const next = vi.fn();

    await middleware(mockReq(), mockRes(), next);
    await middleware(mockReq(), mockRes(), next);

    const res = mockRes();
    await middleware(mockReq(), res, next);

    expect(next).toHaveBeenCalledTimes(3);
    const lastCall = next.mock.calls[2]![0];
    expect(lastCall).toBeDefined();
    expect(lastCall.code).toBe(429);
    expect(lastCall.message).toBe('Too many requests, please try again later');
  });

  it('includes Retry-After header on 429', async () => {
    middleware = createRateLimiter({ windowMs: 60_000, maxRequests: 1 }) as typeof middleware;
    const next = vi.fn();

    await middleware(mockReq(), mockRes(), next);

    const res = mockRes();
    await middleware(mockReq(), res, next);

    expect(res.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
    const retryAfter = Number(res._headers.get('Retry-After'));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('resets counter after window expires', async () => {
    middleware = createRateLimiter({ windowMs: 60_000, maxRequests: 1 }) as typeof middleware;
    const next = vi.fn();

    await middleware(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenLastCalledWith();

    // Exceed limit
    await middleware(mockReq(), mockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[1]![0]).toBeDefined();

    // Advance past window
    vi.advanceTimersByTime(60_001);

    const freshNext = vi.fn();
    await middleware(mockReq(), mockRes(), freshNext);
    expect(freshNext).toHaveBeenCalledTimes(1);
    expect(freshNext).toHaveBeenLastCalledWith();
  });

  it('bypasses limit when isExempt returns true', async () => {
    middleware = createRateLimiter({
      windowMs: 60_000,
      maxRequests: 1,
      isExempt: () => true,
    }) as typeof middleware;
    const next = vi.fn();

    // All requests should be allowed regardless of count
    await middleware(mockReq(), mockRes(), next);
    await middleware(mockReq(), mockRes(), next);
    await middleware(mockReq(), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(3);
    for (const call of next.mock.calls) {
      expect(call[0]).toBeUndefined();
    }
  });
});
