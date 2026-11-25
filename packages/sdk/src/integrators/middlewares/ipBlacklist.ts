import { RequestHandler } from 'express';
import logger from '../logger.js';
import prisma from '../prisma.js';
import { handleExit } from '../utils/exit.js';
import ServiceError from '../utils/ServiceError.js';

const CACHE_TTL_MS = 60_000;

export const createIpBlacklist = (): RequestHandler => {
  let cachedIps = Promise.resolve(new Set<string>());
  let timeout: NodeJS.Timeout;

  const refreshIps = () => {
    cachedIps = prisma.$queryRaw<{ ip: string }[]>`SELECT "ip" FROM "private"."BlacklistedIp"`
      .then((rows) => new Set(rows.map((r) => r.ip)))
      .catch((error: unknown) => {
        logger.warn('failed to refresh IP blacklist cache', { error });
        return new Set<string>();
      })
      .finally(() => {
        timeout = setTimeout(refreshIps, CACHE_TTL_MS).unref();
      });
  };

  refreshIps();

  handleExit(() => {
    clearTimeout(timeout);
  });

  return async (req, _res, next) => {
    const ip = req.headers['cf-connecting-ip'];
    if (typeof ip !== 'string') return next();

    if ((await cachedIps).has(ip)) {
      logger.info('blocked request from blacklisted IP', { ip });
      return next(ServiceError.tooManyRequests());
    }

    return next();
  };
};
