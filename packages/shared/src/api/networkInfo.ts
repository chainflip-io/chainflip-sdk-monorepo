import { chainflipAssets, chainflipChains } from '@chainflip/utils/chainflip';
import z from 'zod';

export const NetworkInfo = z.object({
  assets: z.array(
    z.object({
      asset: z.enum(chainflipAssets),
      vaultSwapDepositsEnabled: z.boolean(),
      depositChannelDepositsEnabled: z.boolean(),
      depositChannelCreationEnabled: z.boolean(),
      egressEnabled: z.boolean(),
      boostDepositsEnabled: z.boolean(),
      livePriceProtectionEnabled: z.boolean(),
    }),
  ),
  cfBrokerCommissionBps: z.number(),
  chainTracking: z
    .array(
      z.object({
        chain: z.enum(chainflipChains),
        height: z.number(),
        blockTrackedAt: z.number(),
      }),
    )
    .optional(),
});
