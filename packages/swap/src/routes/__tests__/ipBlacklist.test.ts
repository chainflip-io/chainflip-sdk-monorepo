import type { Request, Response } from 'express';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import prisma from '../../client.js';
import { createIpBlacklist } from '../ipBlacklist.js';

const mockReq = (ip?: string) => ({ headers: { 'cf-connecting-ip': ip } }) as unknown as Request;
const mockRes = () => ({}) as unknown as Response;

describe(createIpBlacklist, () => {
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
    const middleware = createIpBlacklist();
    const next = vi.fn();

    await middleware(mockReq('1.2.3.4'), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]![0];
    expect(error).toBeDefined();
    expect(error.code).toBe(429);
    expect(error.message).toBe('Too many requests, please try again later');
  });

  it('allows a non-blacklisted IP', async () => {
    const middleware = createIpBlacklist();
    const next = vi.fn();

    await middleware(mockReq('10.0.0.1'), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows requests with no IP', async () => {
    const middleware = createIpBlacklist();
    const next = vi.fn();

    await middleware(mockReq(undefined), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('allows request through if cache refresh fails', async () => {
    vi.spyOn(prisma.blacklistedIp, 'findMany').mockRejectedValueOnce(new Error('DB error'));
    const middleware = createIpBlacklist();
    const next = vi.fn();

    await middleware(mockReq('1.2.3.4'), mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});
