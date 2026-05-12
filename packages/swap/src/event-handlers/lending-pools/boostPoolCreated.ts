import { lendingPoolsBoostPoolCreated as schema210 } from '@chainflip/processor/210/lendingPools/boostPoolCreated';
import { lendingPoolsBoostPoolCreated as schema220 } from '@chainflip/processor/220/lendingPools/boostPoolCreated';
import { z } from 'zod';
import { EventHandlerArgs } from '../index.js';

const schema = z.union([schema220.strict(), schema210.strict()]);

export const lendingPoolsBoostPoolCreated = async ({ prisma, event }: EventHandlerArgs) => {
  const {
    boostPool: { asset, tier },
  } = schema.parse(event.args);

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
