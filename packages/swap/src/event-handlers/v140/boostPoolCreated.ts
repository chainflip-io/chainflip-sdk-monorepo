import { z } from 'zod';
import { assetAndChain, number } from '@/shared/parsers';
import { screamingSnakeToPascalCase } from '@/shared/strings';
import { EventHandlerArgs } from '..';
import { InternalAsset } from '../../client';

const boostPoolCreatedEventSchema = z.object({
  boostPool: z.object({
    asset: assetAndChain.transform((chainAsset) => ({
      ...chainAsset,
      asset: screamingSnakeToPascalCase(chainAsset.asset),
    })),
    tier: number,
  }),
});

export const boostPoolCreated = async ({ prisma, event }: EventHandlerArgs) => {
  const {
    boostPool: { asset: chainAsset, tier },
  } = boostPoolCreatedEventSchema.parse(event.args);

  await prisma.boostPool.upsert({
    create: {
      asset: chainAsset.asset as InternalAsset,
      feeTierPips: tier,
      // safe mode is disabled by default which means pools are active
      boostEnabled: true,
      depositEnabled: true,
      withdrawEnabled: true,
    },
    where: {
      asset_feeTierPips: {
        asset: chainAsset.asset as InternalAsset,
        feeTierPips: tier,
      },
    },
    update: {},
  });
};
