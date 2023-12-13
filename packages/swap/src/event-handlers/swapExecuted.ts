import { z } from 'zod';
import { u128, u64 } from '@/shared/parsers';
import { calculateIncludedFees } from '@/swap/utils/fees';
import type { EventHandlerArgs } from '.';

const swapExecutedArgs = z.object({
  swapId: u64,
  egressAmount: u128,
  intermediateAmount: u128.optional(),
});

export type SwapExecutedEvent = z.input<typeof swapExecutedArgs>;

export default async function swapExecuted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId, intermediateAmount, egressAmount } = swapExecutedArgs.parse(
    event.args,
  );
  const swap = await prisma.swap.findUniqueOrThrow({
    where: { nativeId: swapId },
  });

  const fees = await calculateIncludedFees(
    swap.srcAsset,
    swap.destAsset,
    swap.depositAmount.toString(),
    intermediateAmount?.toString(),
    egressAmount.toString(),
  );

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      egressAmount: egressAmount.toString(),
      intermediateAmount: intermediateAmount?.toString(),
      fees: {
        create: fees,
      },
      swapExecutedAt: new Date(block.timestamp),
      swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}
