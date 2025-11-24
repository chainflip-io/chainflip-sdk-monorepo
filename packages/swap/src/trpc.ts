import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { encodeVaultSwapData, encodeVaultSwapDataSchema } from './handlers/encodeVaultSwapData.js';
import networkStatus from './handlers/networkStatus.js';

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

/** @deprecated DEPRECATED(1.12): we switching to ts-rest now boy */
export const appRouter = router({
  encodeVaultSwapData: publicProcedure
    .input(encodeVaultSwapDataSchema)
    .mutation((v) => encodeVaultSwapData(v.input)),
  networkStatus: publicProcedure.query(networkStatus),
});

export type AppRouter = typeof appRouter;
