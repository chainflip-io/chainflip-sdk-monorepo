import { ethereumChainTrackingChainStateUpdated } from '@chainflip/processor/100/ethereumChainTracking/chainStateUpdated';
import { bitcoinChainTrackingChainStateUpdated } from '@chainflip/processor/120/bitcoinChainTracking/chainStateUpdated';
import { solanaChainTrackingChainStateUpdated } from '@chainflip/processor/160/solanaChainTracking/chainStateUpdated';
import { arbitrumChainTrackingChainStateUpdated } from '@chainflip/processor/180/arbitrumChainTracking/chainStateUpdated';
import { assethubChainTrackingChainStateUpdated } from '@chainflip/processor/190/assethubChainTracking/chainStateUpdated';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: arbitrumChainTrackingChainStateUpdated,
  Bitcoin: bitcoinChainTrackingChainStateUpdated,
  Ethereum: ethereumChainTrackingChainStateUpdated,
  Solana: solanaChainTrackingChainStateUpdated,
  Assethub: assethubChainTrackingChainStateUpdated,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type ChainStateUpdatedArgsMap = {
  [C in ChainflipChain]: z.input<(typeof schemas)[C]>;
};

const chainStateUpdated =
  (chain: ChainflipChain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const blockHeight = BigInt(schemas[chain].parse(event.args).newChainState.blockHeight);
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
      prisma.accountCreationDepositChannel.updateMany({
        where: {
          chain,
          depositChainExpiryBlock: { lte: blockHeight },
          isExpired: false,
        },
        data: { isExpired: true },
      }),
    ]);
  };

export default chainStateUpdated;
