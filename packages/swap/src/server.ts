import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { openSwapDepositChannelSchema } from '@/shared/schemas';
import openSwapDepositChannel from './handlers/openSwapDepositChannel';
import authenticate from './quoting/authenticate';
import { maintenanceMiddleware } from './routes/common';
import jitQuote from './routes/jitQuote';
import swap from './routes/swap';
import thirdPartySwap from './routes/thirdPartySwap';
import { publicProcedure, router } from './trpc';

const appRouter = router({
  openSwapDepositChannel: publicProcedure
    .input(openSwapDepositChannelSchema)
    .mutation((v) => openSwapDepositChannel(v.input)),
});

export type AppRouter = typeof appRouter;

const app = express().use(cors());
const server = createServer(app);
const io = new Server(server).use(authenticate);

app.use('/swaps', express.json(), swap);
app.use('/third-party-swap', maintenanceMiddleware, express.json(), thirdPartySwap);

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

app.use('/quote', maintenanceMiddleware, jitQuote(io));

app.use('/trpc', maintenanceMiddleware, trpcExpress.createExpressMiddleware({ router: appRouter }));

export default server;
