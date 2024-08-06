import { z } from 'zod';
import { u64 } from '@/shared/parsers';
import type { EventHandlerArgs } from '.';

const swapRescheduledArgs = z.object({
  swapId: u64,
  executeAt: z.number(),
});

export type SwapRescheduledEvent = z.input<typeof swapRescheduledArgs>;

export default async function swapRescheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId } = swapRescheduledArgs.parse(event.args);

  await prisma.swap.update({
    data: {
      latestSwapScheduledAt: new Date(block.timestamp),
      latestSwapScheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
      retryCount: {
        increment: 1,
      },
    },
    where: { nativeId: swapId },
  });
}
