import { lendingPoolsBoostPoolCreated as schema220 } from '@chainflip/processor/220/lendingPools/boostPoolCreated';
import { EventHandlerArgs } from '../index.js';

const schema = schema220.strict();

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
