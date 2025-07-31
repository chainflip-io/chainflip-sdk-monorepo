import { swappingSwapRescheduled } from '@chainflip/processor/150/swapping/swapRescheduled';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

export type SwapRescheduledArgs = z.input<typeof swappingSwapRescheduled>;

export default async function swapRescheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId } = swappingSwapRescheduled.parse(event.args);

  await prisma.swap.update({
    data: {
      latestSwapRescheduledAt: new Date(block.timestamp),
      latestSwapRescheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
      retryCount: {
        increment: 1,
      },
    },
    where: { nativeId: swapId },
  });
}
