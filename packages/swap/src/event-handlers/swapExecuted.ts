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
  const {
    swapId,
    intermediateAmount,
    egressAmount: destAmount,
  } = swapExecutedArgs.parse(event.args);
  const swap = await prisma.swap.findUniqueOrThrow({
    where: { nativeId: swapId },
  });

  const fees = await calculateIncludedFees(
    swap.srcAsset,
    swap.destAsset,
    swap.srcAmount.toString(),
    intermediateAmount?.toString(),
    destAmount.toString(),
  );

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      destAmount: destAmount.toString(),
      intermediateAmount: intermediateAmount?.toString(),
      fees: {
        create: fees.map((fee) => ({
          type: fee.type,
          asset: fee.asset,
          amount: fee.amount,
        })),
      },
      swapExecutedAt: new Date(block.timestamp),
      swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}
