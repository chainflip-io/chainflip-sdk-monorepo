import { RequestHandler } from 'express';
import { isString } from '@/shared/guards.js';
import env from '../config/env.js';
import { handleExit } from '../utils/function.js';
import logger from '../utils/logger.js';
import ServiceError from '../utils/ServiceError.js';

type IpRecord = {
  timestamps: number[];
  blockedUntil: number;
};

export const createQuoteRateLimit = (): RequestHandler => {
  if (!env.ENABLE_QUOTE_RATE_LIMIT) {
    return (_req, _res, next) => next();
  }

  const records = new Map<string, IpRecord>();
  const windowMs = env.QUOTE_RATE_LIMIT_WINDOW_MS;
  const maxRequests = env.QUOTE_RATE_LIMIT_MAX_REQUESTS;
  const blockDurationMs = env.QUOTE_RATE_LIMIT_BLOCK_DURATION_MS;

  const cleanupIntervalMs = Math.max(windowMs, blockDurationMs);
  const interval = setInterval(() => {
    const now = Date.now();
    const cutoff = now - windowMs;
    for (const [ip, record] of records) {
      // eslint-disable-next-line no-continue
      if (record.blockedUntil > now) continue;
      if (record.timestamps.every((t) => t < cutoff)) {
        records.delete(ip);
      }
    }
  }, cleanupIntervalMs).unref();

  handleExit(() => {
    clearInterval(interval);
  });

  return (req, _res, next) => {
    const ip = req.headers['cf-connecting-ip'];
    if (!isString(ip)) return next();

    const now = Date.now();
    let record = records.get(ip);
    if (!record) {
      record = { timestamps: [], blockedUntil: 0 };
      records.set(ip, record);
    }

    if (record.blockedUntil > now) {
      logger.info('Blocked rate-limited IP', { ip, blockedUntil: record.blockedUntil });
      return next(ServiceError.tooManyRequests());
    }

    if (record.blockedUntil !== 0) {
      record.timestamps = [];
      record.blockedUntil = 0;
    }

    const cutoff = now - windowMs;
    record.timestamps = record.timestamps.filter((t) => t >= cutoff);
    record.timestamps.push(now);

    if (record.timestamps.length > maxRequests) {
      record.blockedUntil = now + blockDurationMs;
      logger.info('IP exceeded quote rate limit; blocking', {
        ip,
        requests: record.timestamps.length,
        blockedUntil: record.blockedUntil,
      });
      return next(ServiceError.tooManyRequests());
    }

    return next();
  };
};
