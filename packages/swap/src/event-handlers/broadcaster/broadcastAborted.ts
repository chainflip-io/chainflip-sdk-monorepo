import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { unsignedInteger } from '@/shared/parsers';
import { EventHandlerArgs } from '../index';

const eventArgs = z.object({
  broadcastId: unsignedInteger,
});

export async function handleEvent(
  chain: ChainflipChain,
  { prisma, block, event }: EventHandlerArgs,
): Promise<void> {
  const { broadcastId } = eventArgs.parse(event.args);

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
