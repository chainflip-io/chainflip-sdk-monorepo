import * as trpcExpress from '@trpc/server/adapters/express';
import { createExpressEndpoints } from '@ts-rest/express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import { Request } from 'express-serve-static-core';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { apiContract } from '@/shared/api/contract.js';
import authenticate from './quoting/authenticate.js';
import Quoter from './quoting/Quoter.js';
import { apiRouter } from './routes/api.js';
import { handleError, maintenanceMode, quoteMiddleware } from './routes/common.js';
import swap from './routes/swap.js';
import thirdPartySwap from './routes/thirdPartySwap.js';
import quoteRouterV2 from './routes/v2/quote.js';
import swapV2 from './routes/v2/swap.js';
import { appRouter } from './trpc.js';
import { lastUpdateHeader } from './utils/intercept.js';
import logger, { logStorage } from './utils/logger.js';

const app = express().use(cors());
const server = createServer(app);
const io = new Server(server).use(authenticate);
const quoter = new Quoter(io);

app.use((req, res, next) => {
  const info = {
    reqId: randomUUID(),
    method: req.method,
    url: req.url,
    startTime: performance.now(),
  };
  logger.info('request received', info);

  res.on('finish', () => {
    logger.info('request finished', {
      ...info,
      endTime: performance.now(),
      duration: performance.now() - info.startTime,
    });
  });

  logStorage.run(info.reqId, next);
});

app.use('/swaps', lastUpdateHeader, express.json(), swap);
app.use('/v2/swaps', lastUpdateHeader, express.json(), swapV2);
app.use('/third-party-swap', maintenanceMode, express.json(), thirdPartySwap);

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

app.use('/v2/quote', quoteMiddleware, quoteRouterV2(quoter));

app.use('/trpc', maintenanceMode, trpcExpress.createExpressMiddleware({ router: appRouter }));

createExpressEndpoints(apiContract, apiRouter, app, {
  globalMiddleware: [
    (req, res, next) => maintenanceMode(req as Request, res, next),
    express.json(),
  ],
});

app.use(handleError);

export default server;
