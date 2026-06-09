import { RequestHandler } from 'express';
import { isString } from '@/shared/guards.js';
import env from '../../config/env.js';
import { handleExit } from '../../utils/function.js';
import logger from '../../utils/logger.js';
import ServiceError from '../../utils/ServiceError.js';

type IpRecord = {
  timestamps: number[];
  blockedUntil: number;
};

export const createNotFoundRateLimit = (): RequestHandler => {
  if (!env.ENABLE_NOT_FOUND_RATE_LIMIT) {
    return (_req, _res, next) => next();
  }

  const records = new Map<string, IpRecord>();
  const windowMs = env.NOT_FOUND_RATE_LIMIT_WINDOW_MS;
  const maxNotFounds = env.NOT_FOUND_MAX_REQUESTS_LIMIT;
  const blockDurationMs = env.NOT_FOUND_RATE_LIMIT_BLOCK_DURATION_MS;

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

  return (req, res, next) => {
    const ip = req.headers['cf-connecting-ip'];
    if (!isString(ip)) return next();

    const now = Date.now();
    let record = records.get(ip);
    if (!record) {
      record = { timestamps: [], blockedUntil: 0 };
      records.set(ip, record);
    }

    if (record.blockedUntil > now) {
      return next(ServiceError.tooManyRequests());
    }

    res.on('finish', () => {
      if (res.statusCode !== 404) return;

      const rec = records.get(ip)!;
      const finishTime = Date.now();
      const cutoff = finishTime - windowMs;

      rec.timestamps = rec.timestamps.filter((t) => t >= cutoff);
      rec.timestamps.push(finishTime);

      if (rec.timestamps.length > maxNotFounds) {
        rec.blockedUntil = finishTime + blockDurationMs;
        rec.timestamps = [];
        logger.warn('IP blocked for excessive 404s', { ip, blockedUntil: rec.blockedUntil });
      }
    });

    return next();
  };
};
