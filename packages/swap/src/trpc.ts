import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { encodeVaultSwapData, encodeVaultSwapDataSchema } from './handlers/encodeVaultSwapData.js';
import networkStatus from './handlers/networkStatus.js';
import {
  openSwapDepositChannel,
  openSwapDepositChannelSchema,
} from './handlers/openSwapDepositChannel.js';

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

/** @deprecated we switching to ts-rest now boy */
export const appRouter = router({
  openSwapDepositChannel: publicProcedure
    .input(openSwapDepositChannelSchema)
    .mutation(async (v) => {
      const result = await openSwapDepositChannel(v.input);
      return {
        ...result,
        channelOpeningFee: BigInt(result.channelOpeningFee),
        srcChainExpiryBlock: BigInt(result.srcChainExpiryBlock),
      };
    }),
  encodeVaultSwapData: publicProcedure.input(encodeVaultSwapDataSchema).mutation(async (v) => {
    const data = await encodeVaultSwapData(v.input);
    switch (data.chain) {
      case 'Arbitrum':
      case 'Ethereum':
        return { ...data, value: BigInt(data.value) };
      default:
        return data;
    }
  }),
  networkStatus: publicProcedure.query(networkStatus),
});

export type AppRouter = typeof appRouter;
