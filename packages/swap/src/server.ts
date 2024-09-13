import * as trpcExpress from '@trpc/server/adapters/express';
import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { openSwapDepositChannelSchema } from '@/shared/schemas';
import openSwapDepositChannel from './handlers/openSwapDepositChannel';
import authenticate from './quoting/authenticate';
import addresses from './routes/addresses';
import { handleError, maintenanceMode } from './routes/common';
import quoteRouter from './routes/quote';
import swap from './routes/swap';
import thirdPartySwap from './routes/thirdPartySwap';
import quoteRouterV2 from './routes/v2/quote';
import swapV2 from './routes/v2/swap';
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
app.use('/v2/swaps', express.json(), swapV2);
app.use('/third-party-swap', maintenanceMode, express.json(), thirdPartySwap);

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

app.use('/quote', quoteRouter(io));
app.use('/v2/quote', quoteRouterV2(io));

app.use('/trpc', maintenanceMode, trpcExpress.createExpressMiddleware({ router: appRouter }));

app.use('/addresses', addresses);

app.use(handleError);

export default server;
