import type { Request, Response } from 'express';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import env from '../../config/env.js';
import { createQuoteRateLimit } from '../quoteRateLimit.js';

const mockReq = (ip?: string) => ({ headers: { 'cf-connecting-ip': ip } }) as unknown as Request;
const mockRes = () => ({}) as unknown as Response;

describe(createQuoteRateLimit, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    Object.assign(env, { ENABLE_QUOTE_RATE_LIMIT: true });
  });

  it('passes everything through when the feature flag is disabled', async () => {
    Object.assign(env, { ENABLE_QUOTE_RATE_LIMIT: false });
    const middleware = createQuoteRateLimit();
    const next = vi.fn();

    for (let i = 0; i < env.QUOTE_RATE_LIMIT_MAX_REQUESTS + 5; i += 1) {
      await middleware(mockReq('1.2.3.4'), mockRes(), next);
    }

    expect(next).toHaveBeenCalledTimes(env.QUOTE_RATE_LIMIT_MAX_REQUESTS + 5);
    for (const call of next.mock.calls) {
      expect(call).toEqual([]);
    }
  });

  it('allows requests when no IP header is present', async () => {
    const middleware = createQuoteRateLimit();
    const next = vi.fn();

    await middleware(mockReq(undefined), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows requests under the threshold', async () => {
    const middleware = createQuoteRateLimit();
    const next = vi.fn();

    for (let i = 0; i < env.QUOTE_RATE_LIMIT_MAX_REQUESTS; i += 1) {
      await middleware(mockReq('1.2.3.4'), mockRes(), next);
    }

    expect(next).toHaveBeenCalledTimes(env.QUOTE_RATE_LIMIT_MAX_REQUESTS);
    for (const call of next.mock.calls) {
      expect(call).toEqual([]);
    }
  });

  it('blocks the request that exceeds the threshold with 429', async () => {
    const middleware = createQuoteRateLimit();
    const next = vi.fn();

    for (let i = 0; i < env.QUOTE_RATE_LIMIT_MAX_REQUESTS; i += 1) {
      await middleware(mockReq('1.2.3.4'), mockRes(), next);
    }

    next.mockClear();
    await middleware(mockReq('1.2.3.4'), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]![0];
    expect(error).toBeDefined();
    expect(error.code).toBe(429);
    expect(error.message).toBe('Too many requests, please try again later');
  });

  it('keeps the IP blocked for the configured block duration', async () => {
    const middleware = createQuoteRateLimit();
    const next = vi.fn();

    for (let i = 0; i <= env.QUOTE_RATE_LIMIT_MAX_REQUESTS; i += 1) {
      await middleware(mockReq('1.2.3.4'), mockRes(), next);
    }

    // Just before the block expires, still blocked
    vi.advanceTimersByTime(env.QUOTE_RATE_LIMIT_BLOCK_DURATION_MS - 1);
    next.mockClear();
    await middleware(mockReq('1.2.3.4'), mockRes(), next);
    expect(next.mock.calls[0]![0]?.code).toBe(429);

    // After the block expires, requests are allowed and counter is reset
    vi.advanceTimersByTime(2);
    next.mockClear();
    await middleware(mockReq('1.2.3.4'), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it('drops timestamps that fall outside the sliding window', async () => {
    const middleware = createQuoteRateLimit();
    const next = vi.fn();

    for (let i = 0; i < env.QUOTE_RATE_LIMIT_MAX_REQUESTS; i += 1) {
      await middleware(mockReq('1.2.3.4'), mockRes(), next);
    }

    // Move past the window so prior timestamps are no longer counted
    vi.advanceTimersByTime(env.QUOTE_RATE_LIMIT_WINDOW_MS + 1);
    next.mockClear();
    await middleware(mockReq('1.2.3.4'), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('tracks each IP independently', async () => {
    const middleware = createQuoteRateLimit();
    const next = vi.fn();

    for (let i = 0; i <= env.QUOTE_RATE_LIMIT_MAX_REQUESTS; i += 1) {
      await middleware(mockReq('1.2.3.4'), mockRes(), next);
    }

    next.mockClear();
    await middleware(mockReq('5.6.7.8'), mockRes(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
