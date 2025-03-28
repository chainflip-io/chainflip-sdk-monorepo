import { z } from 'zod';
import { unsignedInteger } from '@/shared/parsers';
import type { EventHandlerArgs } from '..';
import logger from '../../utils/logger';
import { egressId as egressIdSchema } from '../common';

const ccmBroadcastRequestArgs = z.object({
  egressId: egressIdSchema,
  broadcastId: unsignedInteger,
});

const ccmBroadcastRequested = async ({ event, prisma, block }: EventHandlerArgs) => {
  const { broadcastId, egressId } = ccmBroadcastRequestArgs.parse(event.args);

  const [chain, nativeId] = egressId;

  const egresses = await prisma.egress.findMany({
    where: { chain, nativeId },
  });

  if (egresses.length === 0) {
    logger.customInfo('no egresses found, skipping', {}, { broadcastId });
    return;
  }

  const broadcast = await prisma.broadcast.create({
    data: {
      chain,
      nativeId: broadcastId,
      requestedAt: new Date(block.timestamp),
      requestedBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });

  await prisma.egress.updateMany({
    where: {
      id: { in: egresses.map((egress) => egress.id) },
    },
    data: { broadcastId: broadcast.id },
  });
};

export default ccmBroadcastRequested;
