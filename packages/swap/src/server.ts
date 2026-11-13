import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createApiContract } from '@/shared/api/contract.js';
import env from './config/env.js';
import authenticate from './quoting/authenticate.js';
import Quoter from './quoting/Quoter.js';
import { registerApiRoutes } from './routes/api.js';
import { handleError, jsonBodyParser, quoteMiddleware } from './routes/middlewares/common.js';
import { createIpBlacklist } from './routes/middlewares/ipBlacklist.js';
import { createNotFoundRateLimit } from './routes/middlewares/notFoundRateLimit.js';
import { createQuoteRateLimit } from './routes/middlewares/quoteRateLimit.js';
import quoteRouterV2 from './routes/v2/quote.js';
import swapV2 from './routes/v2/swap.js';
import { lastUpdateHeader } from './utils/intercept.js';
import logger, { logStorage, serializeRequestBody } from './utils/logger.js';

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
      body: serializeRequestBody(req.body),
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

registerApiRoutes(app, createApiContract(env.CHAINFLIP_NETWORK));

app.use(handleError);

export default server;
