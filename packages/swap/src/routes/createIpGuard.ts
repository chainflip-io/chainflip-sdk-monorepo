import { RequestHandler } from 'express';
import { isString } from '@/shared/guards.js';
import prisma from '../client.js';
import { RateLimiter } from './rateLimit.js';
import { handleExit } from '../utils/function.js';
import logger from '../utils/logger.js';
import ServiceError from '../utils/ServiceError.js';

export const createIpGuard = (rateLimitConfig?: {
  windowMs: number;
  maxRequests: number;
}): RequestHandler => {
  let cachedIps = Promise.resolve(new Set<string>());
  const CACHE_TTL_MS = 60_000;

  let timeout: NodeJS.Timeout;

  const refreshIps = () => {
    cachedIps = prisma.blacklistedIp
      .findMany({ select: { ip: true } })
      .then((rows) => new Set(rows.map((r) => r.ip)))
      .catch(() => {
        logger.warn('Failed to refresh IP blacklist cache');
        return new Set<string>();
      })
      .finally(() => {
        timeout = setTimeout(refreshIps, CACHE_TTL_MS).unref();
      });
  };

  refreshIps();

  const limiter = rateLimitConfig && new RateLimiter(rateLimitConfig);

  handleExit(() => {
    clearTimeout(timeout);
    if (limiter) limiter.dispose();
  });

  return async (req, res, next) => {
    const ip = req.headers['cf-connecting-ip'];
    if (!isString(ip)) return next();

    if ((await cachedIps).has(ip)) {
      logger.info('Blocked request from blacklisted IP', { ip });
      return next(ServiceError.tooManyRequests());
    }

    if (limiter) {
      const retryAfter = limiter.check(ip);
      if (retryAfter !== null) {
        logger.info('Rate limited request', { ip });
        res.setHeader('Retry-After', retryAfter);
        return next(ServiceError.tooManyRequests());
      }
    }

    return next();
  };
};
