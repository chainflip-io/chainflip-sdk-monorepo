import { swappingSwapRescheduled as schema200 } from '@chainflip/processor/200/swapping/swapRescheduled';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const schema = schema200.strict();

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
