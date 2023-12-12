import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  getQuoteRequestSchema,
  getQuoteResponseSchema,
  openSwapDepositChannelSchema,
} from '@/shared/schemas';
import getQuote from './handlers/getQuote';
import openSwapDepositChannel from './handlers/openSwapDepositChannel';
import authenticate from './quoting/authenticate';
import fee from './routes/fee';
import quote from './routes/quote';
import swap from './routes/swap';
import thirdPartySwap from './routes/thirdPartySwap';
import { publicProcedure, router } from './trpc';

const app = express().use(cors());
const server = createServer(app);
const io = new Server(server).use(authenticate);

export const appRouter = router({
  openSwapDepositChannel: publicProcedure
    .input(openSwapDepositChannelSchema)
    .mutation((v) => openSwapDepositChannel(v.input)),
  getQuote: publicProcedure
    .input(getQuoteRequestSchema)
    .output(getQuoteResponseSchema)
    .query((v) => getQuote(io, v.input)),
});

export type AppRouter = typeof appRouter;

app.use('/fees', fee);
app.use('/swaps', express.json(), swap);
app.use('/third-party-swap', express.json(), thirdPartySwap);

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

// TODO: remove when trpc is tested
app.use('/quote', quote(io));

app.use('/trpc', trpcExpress.createExpressMiddleware({ router: appRouter }));

export default server;
