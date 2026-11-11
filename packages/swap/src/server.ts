import { createExpressEndpoints } from '@ts-rest/express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import { Request } from 'express-serve-static-core';
import { createServer } from 'http';
import stringify from 'safe-stable-stringify';
import { Server } from 'socket.io';
import { createApiContract } from '@/shared/api/contract.js';
import env from './config/env.js';
import authenticate from './quoting/authenticate.js';
import Quoter from './quoting/Quoter.js';
import { createApiRouter } from './routes/api.js';
import {
  handleError,
  jsonBodyParser,
  maintenanceMode,
  quoteMiddleware,
} from './routes/middlewares/common.js';
import { createIpBlacklist } from './routes/middlewares/ipBlacklist.js';
import { createNotFoundRateLimit } from './routes/middlewares/notFoundRateLimit.js';
import { createQuoteRateLimit } from './routes/middlewares/quoteRateLimit.js';
import quoteRouterV2 from './routes/v2/quote.js';
import swapV2 from './routes/v2/swap.js';
import { lastUpdateHeader } from './utils/intercept.js';
import logger, { logStorage } from './utils/logger.js';

const MAX_LOGGED_BODY_LENGTH = 10_000;

// the request body is only parsed by `jsonBodyParser()` further down the middleware chain, so it is
// logged when the request finishes rather than when it is received
const serializeBody = (body: unknown): unknown => {
  if (body === undefined || body === null) return undefined;
  if (typeof body === 'object' && Object.keys(body).length === 0) return undefined;

  const serialized = stringify(body);
  if (serialized === undefined) return undefined;
  if (serialized.length <= MAX_LOGGED_BODY_LENGTH) return JSON.parse(serialized);

  return `${serialized.slice(0, MAX_LOGGED_BODY_LENGTH)}...(truncated, ${serialized.length} chars)`;
};

const app = express().use(cors({ exposedHeaders: ['x-request-id'] }));
const server = createServer(app);
const io = new Server(server).use(authenticate);
const quoter = new Quoter(io);

app.use((req, res, next) => {
  const startTime = performance.now();
  const info = {
    reqId: randomUUID(),
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
  };
  res.setHeader('x-request-id', info.reqId);
  logger.info('request received', info);

  res.on('finish', () => {
    logger.info('request finished', {
      reqId: info.reqId,
      duration: performance.now() - startTime,
      statusCode: res.statusCode,
      body: serializeBody(req.body),
    });
  });

  logStorage.run(info.reqId, next);
});

app.use(
  '/v2/swaps',
  createIpBlacklist(),
  createNotFoundRateLimit(),
  lastUpdateHeader,
  jsonBodyParser(),
  swapV2,
);

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

app.use('/v2/quote', createQuoteRateLimit(), quoteMiddleware, quoteRouterV2(quoter));

const contract = createApiContract(env.CHAINFLIP_NETWORK);
createExpressEndpoints(contract, createApiRouter(contract), app, {
  globalMiddleware: [
    (req, res, next) => maintenanceMode(req as Request, res, next),
    jsonBodyParser(),
  ],
});

app.use(handleError);

export default server;
