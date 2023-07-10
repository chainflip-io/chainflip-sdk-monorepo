import { z } from 'zod';
import { unsignedInteger } from '@/shared/parsers';
import logger from '../utils/logger';
import { egressId as egressIdParser } from './common';
import type { EventHandlerArgs } from '.';

const eventArgs = z.object({
  broadcastId: unsignedInteger,
  egressIds: z.array(egressIdParser),
});

/**
 * this event emits a list of egress ids and a new broadcast id to track the
 * egress. the broadcast success event will be emitted with this id when all
 * of the egresss are successful
 */
export default async function networkBatchBroadcastRequested({
  prisma,
  event,
}: EventHandlerArgs): Promise<void> {
  const { broadcastId, egressIds } = eventArgs.parse(event.args);

  if (egressIds.length === 0) {
    logger.customInfo('no egress ids, skipping', {}, { broadcastId });
    return;
  }

  const [[chain]] = egressIds;

  const depositChannels = await prisma.egress.findMany({
    where: {
      chain,
      nativeId: { in: egressIds.map(([, id]) => id) },
    },
  });

  if (depositChannels.length === 0) {
    logger.customInfo('no egresss found, skipping', {}, { broadcastId });
    return;
  }

  const broadcast = await prisma.broadcast.create({
    data: { chain, nativeId: broadcastId },
  });

  await prisma.egress.updateMany({
    where: {
      id: { in: depositChannels.map((destination) => destination.id) },
    },
    data: { broadcastId: broadcast.id },
  });
}
