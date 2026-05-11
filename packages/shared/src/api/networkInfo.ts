import { chainflipAssets } from '@chainflip/utils/chainflip';
import z from 'zod';

export const NetworkInfo = z.object({
  assets: z.array(
    z.object({
      asset: z.enum(chainflipAssets),
      vaultSwapDepositsEnabled: z.boolean().optional(),
      depositChannelDepositsEnabled: z.boolean().optional(),
      depositChannelCreationEnabled: z.boolean().optional(),
      egressEnabled: z.boolean().optional(),
      boostDepositsEnabled: z.boolean().optional(),
      livePriceProtectionEnabled: z.boolean().optional(),
    }),
  ),
  cfBrokerCommissionBps: z.number(),
});
