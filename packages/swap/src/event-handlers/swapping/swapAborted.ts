import { swappingSwapAborted as schema11100 } from '@chainflip/processor/11100/swapping/swapAborted';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

export type SwappingSwapAbortedArgs = z.input<typeof schema11100>;

export default async function swapAborted({ prisma, event, block }: EventHandlerArgs) {
  const { swapId, reason: swapAbortedReason } = schema11100.parse(event.args);

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      swapAbortedAt: new Date(block.timestamp),
      swapAbortedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapAbortedReason,
    },
  });
}
