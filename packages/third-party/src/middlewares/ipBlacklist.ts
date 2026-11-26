import { RequestHandler } from 'express';
import logger from '../logger.js';
import prisma from '../prisma.js';
import { handleExit } from '../utils/exit.js';
import ServiceError from '../utils/ServiceError.js';

const CACHE_TTL_MS = 60_000;

export const createIpBlacklist = (): RequestHandler => {
  let ips = new Set<string>();
  let timeout: NodeJS.Timeout;

  const refreshIps = () =>
    prisma.$queryRaw<{ ip: string }[]>`SELECT "ip" FROM "private"."BlacklistedIp"`
      .then((rows) => {
        ips = new Set(rows.map((r) => r.ip));
      })
      .catch((error: unknown) => {
        logger.error('failed to refresh IP blacklist cache', { error });
      })
      .finally(() => {
        timeout = setTimeout(refreshIps, CACHE_TTL_MS).unref();
      });

  const initialLoad = refreshIps();

  handleExit(() => {
    clearTimeout(timeout);
  });

  return async (req, _res, next) => {
    const ip = req.headers['cf-connecting-ip'];
    if (typeof ip !== 'string') return next();

    await initialLoad;

    if (ips.has(ip)) {
      logger.info('blocked request from blacklisted IP', { ip });
      return next(ServiceError.tooManyRequests());
    }

    return next();
  };
};
