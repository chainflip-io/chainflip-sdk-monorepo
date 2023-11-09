import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  getSwapStatusSchema,
  openSwapDepositChannelSchema,
  swapResponseSchema,
} from '@/shared/schemas';
import getSwapStatus from './handlers/getSwapStatus';
import openSwapDepositChannel from './handlers/openSwapDepositChannel';
import authenticate from './quoting/authenticate';
import fee from './routes/fee';
import quote from './routes/quote';
import swap from './routes/swap';
import thirdPartySwap from './routes/thirdPartySwap';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
  openSwapDepositChannel: publicProcedure
    .input(openSwapDepositChannelSchema)
    .mutation((v) => openSwapDepositChannel(v.input)),
  getStatus: publicProcedure
    .input(getSwapStatusSchema)
    .output(swapResponseSchema)
    .query((v) => getSwapStatus(v.input)),
});

export type AppRouter = typeof appRouter;

const app = express().use(cors());
const server = createServer(app);
const io = new Server(server).use(authenticate);

app.use('/fees', fee);
app.use('/third-party-swap', express.json(), thirdPartySwap);

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

app.use('/quote', quote(io));
app.use('/swaps', express.json(), swap);
app.use('/trpc', trpcExpress.createExpressMiddleware({ router: appRouter }));

export default server;
