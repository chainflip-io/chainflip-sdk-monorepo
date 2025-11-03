import { swappingSwapAborted as schema11200 } from '@chainflip/processor/11200/swapping/swapAborted';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

export type SwappingSwapAbortedArgs = z.input<typeof schema11200>;

export default async function swapAborted({ prisma, event, block }: EventHandlerArgs) {
  const { swapId, reason: swapAbortedReason } = schema11200.parse(event.args);

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      swapAbortedAt: new Date(block.timestamp),
      swapAbortedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapAbortedReason,
    },
  });
}
