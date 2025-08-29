import { swappingSwapRescheduled as schema11100 } from '@chainflip/processor/11100/swapping/swapRescheduled';
import { swappingSwapRescheduled } from '@chainflip/processor/150/swapping/swapRescheduled';
import { z } from 'zod';
import { SwapFailureReason } from '../../client.js';
import type { EventHandlerArgs } from '../index.js';

const schema = z.union([schema11100, swappingSwapRescheduled]);

export type SwapRescheduledArgs = z.input<typeof schema>;

export default async function swapRescheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId, ...rest } = schema.parse(event.args);

  let rescheduledReason: SwapFailureReason | undefined;

  // TODO(1.11): refactor
  if ('reason' in rest) {
    rescheduledReason = rest.reason;
  }

  await prisma.swap.update({
    data: {
      latestSwapRescheduledAt: new Date(block.timestamp),
      latestSwapRescheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
      latestSwapRescheduledReason: rescheduledReason,
      retryCount: {
        increment: 1,
      },
    },
    where: { nativeId: swapId },
  });
}
