import { RequestHandler } from 'express';
import { handleExit } from '../utils/exit.js';
import ServiceError from '../utils/ServiceError.js';

const WINDOW_MS = 60_000;

// Fixed-window rate limit per client IP. Every request through our routes is spent from our single
// SwapKit API key, so one client must not be able to exhaust SwapKit's limit for everyone.
// In-memory and per pod: with N replicas the effective limit is N times higher.
export const createRateLimit = (maxRequestsPerMinute: number): RequestHandler => {
  let windowStart = Date.now();
  let counts = new Map<string, number>();

  const interval = setInterval(() => {
    windowStart = Date.now();
    counts = new Map();
  }, WINDOW_MS).unref();

  handleExit(() => clearInterval(interval));

  return (req, res, next) => {
    const header = req.headers['cf-connecting-ip'];
    const ip = typeof header === 'string' ? header : (req.ip ?? 'unknown');

    const count = (counts.get(ip) ?? 0) + 1;
    counts.set(ip, count);

    if (count > maxRequestsPerMinute) {
      const retryAfterSeconds = Math.ceil((windowStart + WINDOW_MS - Date.now()) / 1000);
      res.setHeader('retry-after', String(Math.max(retryAfterSeconds, 1)));
      next(ServiceError.tooManyRequests());
      return;
    }

    next();
  };
};
