import { swappingSwapAborted as schema11200 } from '@chainflip/processor/11200/swapping/swapAborted';
import { swappingSwapAborted as schema200 } from '@chainflip/processor/200/swapping/swapAborted';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

const schema = z.union([schema200.strict(), schema11200.strict()]);

export type SwappingSwapAbortedArgs = z.input<typeof schema>;

export default async function swapAborted({ prisma, event, block }: EventHandlerArgs) {
  const { swapId, reason: swapAbortedReason } = schema.parse(event.args);

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      swapAbortedAt: new Date(block.timestamp),
      swapAbortedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapAbortedReason,
    },
  });
}
