import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { encodeVaultSwapData, encodeVaultSwapDataSchema } from './handlers/encodeVaultSwapData';
import {
  openSwapDepositChannel,
  openSwapDepositChannelSchema,
} from './handlers/openSwapDepositChannel';

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.create({ transformer: superjson });

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const { router, procedure: publicProcedure } = t;

export const appRouter = router({
  openSwapDepositChannel: publicProcedure
    .input(openSwapDepositChannelSchema)
    .mutation((v) => openSwapDepositChannel(v.input)),
  encodeVaultSwapData: publicProcedure
    .input(encodeVaultSwapDataSchema)
    .mutation((v) => encodeVaultSwapData(v.input)),
});

export type AppRouter = typeof appRouter;
