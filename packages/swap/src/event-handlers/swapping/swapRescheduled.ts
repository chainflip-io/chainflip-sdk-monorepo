import { swappingSwapRescheduled as schema11100 } from '@chainflip/processor/11100/swapping/swapRescheduled';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const schema = schema11100;

export type SwapRescheduledArgs = z.input<typeof schema>;

export default async function swapRescheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId, reason } = schema.parse(event.args);

  await prisma.swap.update({
    data: {
      latestSwapRescheduledAt: new Date(block.timestamp),
      latestSwapRescheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
      latestSwapRescheduledReason: reason,
      retryCount: {
        increment: 1,
      },
    },
    where: { nativeId: swapId },
  });
}
