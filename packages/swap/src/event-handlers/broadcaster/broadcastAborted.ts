import { bitcoinBroadcasterBroadcastAborted } from '@chainflip/processor/100/bitcoinBroadcaster/broadcastAborted';
import { ethereumBroadcasterBroadcastAborted } from '@chainflip/processor/100/ethereumBroadcaster/broadcastAborted';
import { arbitrumBroadcasterBroadcastAborted } from '@chainflip/processor/141/arbitrumBroadcaster/broadcastAborted';
import { solanaBroadcasterBroadcastAborted } from '@chainflip/processor/150/solanaBroadcaster/broadcastAborted';
import { assethubBroadcasterBroadcastAborted } from '@chainflip/processor/190/assethubBroadcaster/broadcastAborted';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: arbitrumBroadcasterBroadcastAborted,
  Bitcoin: bitcoinBroadcasterBroadcastAborted,
  Ethereum: ethereumBroadcasterBroadcastAborted,
  Solana: solanaBroadcasterBroadcastAborted,
  Assethub: assethubBroadcasterBroadcastAborted,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type BroadcastAbortedArgsMap = {
  [C in ChainflipChain]: z.input<(typeof schemas)[C]>;
};

async function handleEvent(
  chain: ChainflipChain,
  { prisma, block, event }: EventHandlerArgs,
): Promise<void> {
  const { broadcastId } = schemas[chain].parse(event.args);

  // use updateMany to skip update if broadcast does not include any swap
  await prisma.broadcast.updateMany({
    where: { chain, nativeId: broadcastId },
    data: {
      abortedAt: new Date(block.timestamp),
      abortedBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}

export default function broadcastAborted(
  chain: ChainflipChain,
): (args: EventHandlerArgs) => Promise<void> {
  return (args: EventHandlerArgs) => handleEvent(chain, args);
}
