import { swappingSwapCanceled as schema11100 } from '@chainflip/processor/11100/swapping/swapCanceled';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

export type SwappingSwapCanceledArgs = z.input<typeof schema11100>;

export default async function swapCanceled({ prisma, event, block }: EventHandlerArgs) {
  const { swapId } = schema11100.parse(event.args);

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      swapCanceledAt: new Date(block.timestamp),
      swapCanceledBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}
