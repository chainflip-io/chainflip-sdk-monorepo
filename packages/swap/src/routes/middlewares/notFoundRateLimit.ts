import { RequestHandler } from 'express';
import { isString } from '@/shared/guards.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import ServiceError from '../../utils/ServiceError.js';

const WINDOW_MS = 60_000; // 1 minute
const BAN_DURATION_MS = 10 * 60_000; // 10 minutes
const MAX_NOT_FOUNDS = env.NOT_FOUND_MAX_REQUESTS_LIMIT;

type IpRecord = {
  timestamps: number[];
  bannedUntil: number;
};

const records = new Map<string, IpRecord>();

export const notFoundRateLimit: RequestHandler = (req, res, next) => {
  if (!env.ENABLE_NOT_FOUND_RATE_LIMIT) {
    return next();
  }
  const ip = req.headers['cf-connecting-ip'] ?? req.ip;
  if (!isString(ip)) return next();

  const now = Date.now();
  let record = records.get(ip);
  if (!record) {
    record = { timestamps: [], bannedUntil: 0 };
    records.set(ip, record);
  }

  if (record.bannedUntil > now) {
    return next(ServiceError.tooManyRequests());
  }

  res.on('finish', () => {
    if (res.statusCode !== 404) return;

    const rec = records.get(ip)!;
    const finishTime = Date.now();
    const cutoff = finishTime - WINDOW_MS;

    rec.timestamps = rec.timestamps.filter((t) => t >= cutoff);
    rec.timestamps.push(finishTime);

    if (rec.timestamps.length > MAX_NOT_FOUNDS) {
      rec.bannedUntil = finishTime + BAN_DURATION_MS;
      rec.timestamps = [];
      logger.warn('IP banned for excessive 404s', { ip, bannedUntil: rec.bannedUntil });
    }
  });

  return next();
};
