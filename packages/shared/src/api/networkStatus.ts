import { chainflipAssets } from '@chainflip/utils/chainflip';
import { z } from 'zod';

const ChainflipAsset = z.enum(chainflipAssets);

export const NetworkStatus = z.object({
  assets: z.object({
    deposit: z.array(ChainflipAsset),
    destination: z.array(ChainflipAsset),
    all: z.array(ChainflipAsset),
  }),
  boostDepositsEnabled: z.boolean(),
  cfBrokerCommissionBps: z.number(),
});
