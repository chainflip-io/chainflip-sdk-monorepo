import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import { createServer } from 'http';
import env from './env.js';
import logger from './logger.js';
import { handleError } from './middlewares/handleError.js';
import { createIpBlacklist } from './middlewares/ipBlacklist.js';
import router from './routes/index.js';

const app = express();

app.use(
  cors({
    origin:
      env.INTEGRATORS_ALLOWED_ORIGINS.size === 0
        ? true
        : (origin, cb) =>
            cb(null, !origin || env.INTEGRATORS_ALLOWED_ORIGINS.has(origin.toLowerCase())),
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
      url: req.url,
      statusCode: res.statusCode,
      durationMs: Math.round(performance.now() - startTime),
    });
  });

  next();
});

app.get('/healthcheck', (_req, res) => {
  res.status(200).send('OK');
});

app.use('/v2/integrators', createIpBlacklist(), express.json(), router);

app.use(handleError);

export { app };

export default createServer(app);
