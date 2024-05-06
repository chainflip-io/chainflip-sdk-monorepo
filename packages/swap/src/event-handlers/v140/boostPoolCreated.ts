import { z } from 'zod';
import { internalAssetEnum, number } from '@/shared/parsers';
import { EventHandlerArgs } from '..';

const boostPoolCreatedEventSchema = z.object({
  boostPool: z.object({
    asset: internalAssetEnum,
    tier: number,
  }),
});

export const boostPoolCreated = async ({ prisma, event }: EventHandlerArgs) => {
  const {
    boostPool: { asset, tier },
  } = boostPoolCreatedEventSchema.parse(event.args);

  await prisma.boostPool.upsert({
    create: {
      asset,
      feeTierPips: tier,
      // safe mode is disabled by default which means pools are active
      boostEnabled: true,
      depositEnabled: true,
      withdrawEnabled: true,
    },
    where: {
      asset_feeTierPips: {
        asset,
        feeTierPips: tier,
      },
    },
    update: {},
  });
};
