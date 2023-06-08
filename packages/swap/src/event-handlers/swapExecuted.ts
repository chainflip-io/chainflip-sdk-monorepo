import { z } from 'zod';
import { unsignedInteger } from '@/shared/parsers';
import logger from '../utils/logger';
import type { EventHandlerArgs } from '.';

const eventArgs = z.object({ swapId: unsignedInteger });

export default async function swapExecuted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  try {
    const { swapId } = eventArgs.parse(event.args);

    await prisma.swap.updateMany({
      where: { nativeId: swapId },
      data: {
        swapExecutedAt: new Date(block.timestamp),
        swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });
  } catch (error) {
    logger.customError(
      'error in "swapExecuted" handler',
      { alertCode: 'EventHandlerError' },
      { error, handler: 'swapExecuted' },
    );
    throw error;
  }
}
