import { z } from 'zod';
import { Chain } from '@/shared/enums';
import { unsignedInteger } from '@/shared/parsers';
import logger from '../utils/logger';
import type { EventHandlerArgs } from './index';

const eventArgs = z.object({
  broadcastId: unsignedInteger,
});

export async function handleEvent(
  chain: Chain,
  { prisma, block, event }: EventHandlerArgs,
): Promise<void> {
  const { broadcastId } = eventArgs.parse(event.args);

  const broadcast = await prisma.broadcast.findUnique({
    where: { nativeId_chain: { chain, nativeId: broadcastId } },
    include: { egresses: { include: { swap: true } } },
  });

  if (!broadcast) {
    logger.customInfo(
      'no broadcast found, skipping',
      {},
      { broadcastId, chain },
    );
    return;
  }
  await prisma.swap.updateMany({
    where: {
      id: {
        in: broadcast.egresses.reduce((acc, egress) => {
          if (egress.swapId !== null) acc.push(egress.swapId);
          return acc;
        }, [] as bigint[]),
      },
    },
    data: {
      egressCompletedAt: new Date(block.timestamp),
      egressCompletedBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}

/**
 * this event is emitted when a broadcast is successful. all of the destinations
 * contained by the broadcast id can be marked as successful
 */
export default function networkBroadcastSuccess(
  chain: Chain,
): (args: EventHandlerArgs) => Promise<void> {
  return (args: EventHandlerArgs) => handleEvent(chain, args);
}
