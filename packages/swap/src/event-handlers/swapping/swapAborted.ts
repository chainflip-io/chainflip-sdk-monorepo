import { swappingSwapAborted as schema200 } from '@chainflip/processor/200/swapping/swapAborted';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

const schema = schema200.strict();

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
