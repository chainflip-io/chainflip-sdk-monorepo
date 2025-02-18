import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  encodeVaultSwapData,
  encodeVaultSwapDataSchema,
} from '@/swap/handlers/encodeVaultSwapData';
import {
  openSwapDepositChannel,
  openSwapDepositChannelSchema,
} from './handlers/openSwapDepositChannel';
import authenticate from './quoting/authenticate';
import Quoter from './quoting/Quoter';
import addresses from './routes/addresses';
import { handleError, maintenanceMode, quoteMiddleware } from './routes/common';
import quoteRouter from './routes/quote';
import swap from './routes/swap';
import thirdPartySwap from './routes/thirdPartySwap';
import quoteRouterV2 from './routes/v2/quote';
import swapV2 from './routes/v2/swap';
import { publicProcedure, router } from './trpc';
import { lastUpdateHeader } from './utils/intercept';
import logger from './utils/logger';

const appRouter = router({
  openSwapDepositChannel: publicProcedure
    .input(openSwapDepositChannelSchema)
    .mutation((v) => openSwapDepositChannel(v.input)),
  encodeVaultSwapData: publicProcedure
    .input(encodeVaultSwapDataSchema)
    .query((v) => encodeVaultSwapData(v.input)),
});

export type AppRouter = typeof appRouter;

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

  next();
});

app.use('/swaps', lastUpdateHeader, express.json(), swap);
app.use('/v2/swaps', lastUpdateHeader, express.json(), swapV2);
app.use('/third-party-swap', maintenanceMode, express.json(), thirdPartySwap);

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

app.use('/quote', quoteMiddleware, quoteRouter(quoter));
app.use('/v2/quote', quoteMiddleware, quoteRouterV2(quoter));

app.use('/trpc', maintenanceMode, trpcExpress.createExpressMiddleware({ router: appRouter }));

app.use('/addresses', addresses);

app.use(handleError);

export default server;
