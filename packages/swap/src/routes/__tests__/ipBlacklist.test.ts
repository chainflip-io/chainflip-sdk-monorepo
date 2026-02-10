import type { Request, Response } from 'express';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import prisma from '../../client.js';
import { createIpGuard } from '../ipBlacklist.js';

const mockReq = (ip?: string) => ({ headers: { 'cf-connecting-ip': ip } }) as unknown as Request;
const mockRes = () => ({ setHeader: vi.fn() }) as unknown as Response;

describe(createIpGuard, () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await prisma.blacklistedIp.createMany({
      data: [{ ip: '1.2.3.4' }, { ip: '5.6.7.8' }],
    });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await prisma.blacklistedIp.deleteMany();
  });

  it('blocks a blacklisted IP with 429', async () => {
    const middleware = createIpGuard();
    const next = vi.fn();

    await middleware(mockReq('1.2.3.4'), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]![0];
    expect(error).toBeDefined();
    expect(error.code).toBe(429);
    expect(error.message).toBe('Too many requests, please try again later');
  });

  it('allows a non-blacklisted IP', async () => {
    const middleware = createIpGuard();
    const next = vi.fn();

    await middleware(mockReq('10.0.0.1'), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows requests with no IP', async () => {
    const middleware = createIpGuard();
    const next = vi.fn();

    await middleware(mockReq(undefined), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows request through if cache refresh fails', async () => {
    vi.spyOn(prisma.blacklistedIp, 'findMany').mockRejectedValueOnce(new Error('DB error'));
    const middleware = createIpGuard();
    const next = vi.fn();

    await middleware(mockReq('1.2.3.4'), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  describe('with rate limiting', () => {
    it('rate limits a non-blacklisted IP after exceeding limit', async () => {
      const middleware = createIpGuard({ windowMs: 60_000, maxRequests: 3 });
      const next = vi.fn();

      for (let i = 0; i < 3; i += 1) {
        await middleware(mockReq('10.0.0.1'), mockRes(), next);
      }
      expect(next).toHaveBeenCalledTimes(3);
      expect(next.mock.calls.every((call: unknown[]) => call.length === 0)).toBe(true);

      next.mockClear();
      await middleware(mockReq('10.0.0.1'), mockRes(), next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0]![0];
      expect(error).toBeDefined();
      expect(error.code).toBe(429);
    });

    it('sets Retry-After header on rate-limited responses', async () => {
      const middleware = createIpGuard({ windowMs: 60_000, maxRequests: 1 });
      const next = vi.fn();

      await middleware(mockReq('10.0.0.1'), mockRes(), next);
      expect(next).toHaveBeenCalledWith();

      next.mockClear();
      const res = mockRes();
      await middleware(mockReq('10.0.0.1'), res, next);

      expect(next.mock.calls[0]![0].code).toBe(429);
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    });

    it('rejects blacklisted IP before consuming rate limit', async () => {
      const middleware = createIpGuard({ windowMs: 60_000, maxRequests: 1 });
      const next = vi.fn();

      // Blacklisted IP should be rejected by blacklist, not rate limit
      await middleware(mockReq('1.2.3.4'), mockRes(), next);
      expect(next.mock.calls[0]![0].code).toBe(429);

      // A second request should also be rejected by blacklist (rate limit not consumed)
      next.mockClear();
      await middleware(mockReq('1.2.3.4'), mockRes(), next);
      expect(next.mock.calls[0]![0].code).toBe(429);

      // Non-blacklisted IP should still have its full quota
      next.mockClear();
      await middleware(mockReq('10.0.0.1'), mockRes(), next);
      expect(next).toHaveBeenCalledWith();
    });

    it('does not rate limit when config is omitted', async () => {
      const middleware = createIpGuard();
      const next = vi.fn();

      // Make many requests — should all pass since there's no rate limiter
      for (let i = 0; i < 100; i += 1) {
        await middleware(mockReq('10.0.0.1'), mockRes(), next);
      }
      expect(next).toHaveBeenCalledTimes(100);
      expect(next.mock.calls.every((call: unknown[]) => call.length === 0)).toBe(true);
    });
  });
});
