import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import { createServer } from 'http';
import env from './env.js';
import logger from './logger.js';
import { handleError } from './middlewares/handleError.js';
import { createIpBlacklist } from './middlewares/ipBlacklist.js';
import { createRateLimit } from './middlewares/rateLimit.js';
import router from './router.js';
import ServiceError from './utils/ServiceError.js';

const app = express();

app.use(
  cors({
    origin:
      env.THIRD_PARTY_ALLOWED_ORIGINS.size === 0
        ? true
        : (origin, cb) =>
            cb(null, !origin || env.THIRD_PARTY_ALLOWED_ORIGINS.has(origin.toLowerCase())),
    exposedHeaders: ['x-request-id'],
  }),
);

app.use((req, res, next) => {
  const reqId = randomUUID();
  const startTime = performance.now();
  res.setHeader('x-request-id', reqId);

  res.on('finish', () => {
    logger.info('request completed', {
      reqId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Math.round(performance.now() - startTime),
    });
  });

  next();
});

app.get('/healthcheck', (_req, res) => {
  res.status(200).send('OK');
});

// third-party providers only route real mainnet funds, so test networks don't serve these routes
if (env.CHAINFLIP_NETWORK === 'mainnet') {
  app.use(
    '/third-party',
    createIpBlacklist(),
    createRateLimit(env.THIRD_PARTY_RATE_LIMIT_PER_MINUTE),
    express.json(),
    router,
  );
}

app.use('/third-party', (_req, _res, next) => {
  next(ServiceError.notFound());
});

app.use(handleError);

export { app };

export default createServer(app);
