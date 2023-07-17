import { z } from 'zod';
import { Chain } from '@/shared/enums';
import { unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from './index';

const eventArgs = z.object({
  broadcastId: unsignedInteger,
});

export async function handleEvent(
  chain: Chain,
  { prisma, block, event }: EventHandlerArgs,
): Promise<void> {
  const { broadcastId } = eventArgs.parse(event.args);

  await prisma.broadcast.update({
    where: { nativeId_chain: { chain, nativeId: broadcastId } },
    data: {
      succeededAt: new Date(block.timestamp),
      succeededBlockIndex: `${block.height}-${event.indexInBlock}`,
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
