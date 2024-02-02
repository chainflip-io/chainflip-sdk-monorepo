import { z } from 'zod';
import { u128, u64 } from '@/shared/parsers';
import { calculateIncludedSwapFees } from '@/swap/utils/fees';
import type { EventHandlerArgs } from '.';

const swapExecutedArgs = z.intersection(
  z.object({
    swapId: u64,
    intermediateAmount: u128.optional(),
  }),
  z.union([
    // before v1.2.0
    z
      .object({ egressAmount: u128 })
      .transform(({ egressAmount }) => ({ outputAmount: egressAmount })),
    // after v1.2.0
    z.object({ outputAmount: u128 }),
  ]),
);

export type SwapExecutedEvent = z.input<typeof swapExecutedArgs>;

export default async function swapExecuted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId, intermediateAmount, outputAmount } = swapExecutedArgs.parse(
    event.args,
  );
  const swap = await prisma.swap.findUniqueOrThrow({
    where: { nativeId: swapId },
  });

  const fees = await calculateIncludedSwapFees(
    swap.srcAsset,
    swap.destAsset,
    swap.swapInputAmount.toFixed(),
    intermediateAmount?.toString(),
    outputAmount.toString(),
  );

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      swapOutputAmount: outputAmount.toString(),
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
