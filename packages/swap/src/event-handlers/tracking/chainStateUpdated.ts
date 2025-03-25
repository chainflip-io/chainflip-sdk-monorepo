import { z } from 'zod';
import { u128 } from '@/shared/parsers';
import { EventHandlerArgs } from '..';
import { Chain } from '../../enums';

const numberOrHex = z.union([u128, z.number().transform((n) => BigInt(n))]);

const chainStateUpdatedArgs = z.object({
  newChainState: z.object({
    blockHeight: numberOrHex,
  }),
});

const chainStateUpdated =
  (chain: Chain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { blockHeight } = chainStateUpdatedArgs.parse(event.args).newChainState;
    const currentTracking = await prisma.chainTracking.findFirst({ where: { chain } });

    // We may receive multiple chain state updates for the same stateChain block,
    // but we want to preserve the last height in the previous stateChain block
    const previousHeight =
      currentTracking?.eventWitnessedBlock === block.height
        ? currentTracking?.previousHeight
        : currentTracking?.height;

    await Promise.all([
      prisma.chainTracking.upsert({
        where: { chain },
        create: {
          chain,
          height: blockHeight,
          blockTrackedAt: block.timestamp,
          eventWitnessedBlock: block.height,
        },
        update: {
          height: blockHeight,
          previousHeight,
          blockTrackedAt: block.timestamp,
          eventWitnessedBlock: block.height,
        },
      }),
      prisma.swapDepositChannel.updateMany({
        where: {
          srcChain: chain,
          srcChainExpiryBlock: { lte: blockHeight },
          isExpired: false,
        },
        data: { isExpired: true },
      }),
    ]);
  };

export default chainStateUpdated;
