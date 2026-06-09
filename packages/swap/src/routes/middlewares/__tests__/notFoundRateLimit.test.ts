import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import env from '../../../config/env.js';
import { createNotFoundRateLimit } from '../notFoundRateLimit.js';

const mockReq = (ip?: string) => ({ headers: { 'cf-connecting-ip': ip } }) as unknown as Request;

const mockRes = (statusCode = 200) => {
  const emitter = new EventEmitter();
  (emitter as any).statusCode = statusCode;
  return emitter as unknown as Response;
};

const IP = '1.2.3.4';
const OTHER_IP = '5.6.7.8';

const MAX_REQUESTS = env.NOT_FOUND_MAX_REQUESTS_LIMIT;

describe(createNotFoundRateLimit, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.assign(env, { ENABLE_NOT_FOUND_RATE_LIMIT: true });
  });

  const request = (
    middleware: ReturnType<typeof createNotFoundRateLimit>,
    ip: string | undefined,
    statusCode: number,
    next = vi.fn(),
  ) => {
    const res = mockRes(statusCode);
    middleware(mockReq(ip), res, next);
    (res as unknown as EventEmitter).emit('finish');
    return next;
  };

  it('passes everything through when the feature flag is disabled', () => {
    Object.assign(env, { ENABLE_NOT_FOUND_RATE_LIMIT: false });
    const middleware = createNotFoundRateLimit();
    const next = vi.fn();

    for (let i = 0; i < MAX_REQUESTS + 5; i += 1) {
      request(middleware, IP, 404, next);
    }

    expect(next).toHaveBeenCalledTimes(MAX_REQUESTS + 5);
    for (const call of next.mock.calls) {
      expect(call).toEqual([]);
    }
  });

  it('passes through when no IP header is present', () => {
    const middleware = createNotFoundRateLimit();
    const next = vi.fn();
    request(middleware, undefined, 404, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('ignores non-404 responses', () => {
    const middleware = createNotFoundRateLimit();
    for (let i = 0; i < MAX_REQUESTS + 1; i += 1) {
      request(middleware, IP, 200);
    }
    const next = vi.fn();
    request(middleware, IP, 200, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows requests while under the 404 threshold', () => {
    const middleware = createNotFoundRateLimit();
    const next = vi.fn();
    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      request(middleware, IP, 404, next);
    }
    for (const call of next.mock.calls) {
      expect(call).toEqual([]);
    }
  });

  it(`blocks the IP after more than ${MAX_REQUESTS} 404s in the window`, () => {
    const middleware = createNotFoundRateLimit();
    for (let i = 0; i < MAX_REQUESTS + 1; i += 1) {
      request(middleware, IP, 404);
    }
    const next = vi.fn();
    request(middleware, IP, 200, next);
    expect(next.mock.calls[0]![0]?.code).toBe(429);
  });

  it('keeps the IP blocked for the configured block duration', () => {
    const middleware = createNotFoundRateLimit();
    for (let i = 0; i < MAX_REQUESTS + 1; i += 1) {
      request(middleware, IP, 404);
    }

    vi.advanceTimersByTime(env.NOT_FOUND_RATE_LIMIT_BLOCK_DURATION_MS - 1);
    expect(request(middleware, IP, 200).mock.calls[0]![0]?.code).toBe(429);

    vi.advanceTimersByTime(2);
    expect(request(middleware, IP, 200)).toHaveBeenCalledWith();
  });

  it('resets the 404 count after the window expires', () => {
    const middleware = createNotFoundRateLimit();
    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      request(middleware, IP, 404);
    }

    vi.advanceTimersByTime(env.NOT_FOUND_RATE_LIMIT_WINDOW_MS + 1);

    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      request(middleware, IP, 404);
    }

    expect(request(middleware, IP, 200)).toHaveBeenCalledWith();
  });

  it('tracks each IP independently', () => {
    const middleware = createNotFoundRateLimit();
    for (let i = 0; i < MAX_REQUESTS + 1; i += 1) {
      request(middleware, IP, 404);
    }

    expect(request(middleware, IP, 200).mock.calls[0]![0]?.code).toBe(429);
    expect(request(middleware, OTHER_IP, 200)).toHaveBeenCalledWith();
  });
});
