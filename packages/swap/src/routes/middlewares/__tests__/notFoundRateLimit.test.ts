import { EventEmitter } from 'events';
import type { Request, Response } from 'express';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import env from '../../../config/env.js';

const mockReq = (ip?: string) => ({ headers: { 'cf-connecting-ip': ip } }) as unknown as Request;

const mockRes = (statusCode = 200) => {
  const emitter = new EventEmitter();
  (emitter as any).statusCode = statusCode;
  return emitter as unknown as Response;
};

const IP = '1.2.3.4';
const OTHER_IP = '5.6.7.8';

const MAX_REQUESTS = env.NOT_FOUND_RATE_LIMIT_MAX_REQUESTS;
const BAN_DURATION_MS = 10 * 60_000; // 10 minutes

describe('notFoundRateLimit', () => {
  let notFoundRateLimit: (req: Request, res: Response, next: () => void) => void;

  const request = async (ip: string | undefined, statusCode: number, next = vi.fn()) => {
    const res = mockRes(statusCode);
    notFoundRateLimit(mockReq(ip), res, next);
    (res as unknown as EventEmitter).emit('finish');
    return next;
  };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    ({ notFoundRateLimit } = await import('../notFoundRateLimit.js'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('passes through when no IP header is present', async () => {
    const next = vi.fn();
    await request(undefined, 404, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('ignores non-404 responses', async () => {
    for (let i = 0; i < MAX_REQUESTS + 1; i += 1) {
      await request(IP, 200);
    }
    const next = vi.fn();
    await request(IP, 200, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows requests while under the 404 threshold', async () => {
    const next = vi.fn();
    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      await request(IP, 404, next);
    }
    for (const call of next.mock.calls) {
      expect(call).toEqual([]);
    }
  });

  it(`bans the IP after more than ${MAX_REQUESTS} 404s in the window`, async () => {
    for (let i = 0; i < MAX_REQUESTS + 1; i += 1) {
      await request(IP, 404);
    }
    const next = vi.fn();
    await request(IP, 200, next);
    expect(next.mock.calls[0]![0]?.code).toBe(429);
  });

  it('keeps the IP banned for 10 minutes', async () => {
    for (let i = 0; i < MAX_REQUESTS + 1; i += 1) {
      await request(IP, 404);
    }

    vi.advanceTimersByTime(BAN_DURATION_MS - 1);
    expect((await request(IP, 200)).mock.calls[0]![0]?.code).toBe(429);

    vi.advanceTimersByTime(2);
    expect(await request(IP, 200)).toHaveBeenCalledWith();
  });

  it('resets the 404 count after the window expires', async () => {
    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      await request(IP, 404);
    }

    vi.advanceTimersByTime(60_000 + 1);

    for (let i = 0; i < MAX_REQUESTS; i += 1) {
      await request(IP, 404);
    }

    expect(await request(IP, 200)).toHaveBeenCalledWith();
  });

  it('tracks each IP independently', async () => {
    for (let i = 0; i < MAX_REQUESTS + 1; i += 1) {
      await request(IP, 404);
    }

    expect((await request(IP, 200)).mock.calls[0]![0]?.code).toBe(429);
    expect(await request(OTHER_IP, 200)).toHaveBeenCalledWith();
  });
});
