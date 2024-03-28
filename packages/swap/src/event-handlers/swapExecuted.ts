import { z } from 'zod';
import { getInternalAsset } from '@/shared/enums';
import { internalAssetEnum, u128, u64 } from '@/shared/parsers';
import { calculateIncludedSwapFees } from '@/swap/utils/fees';
import type { EventHandlerArgs } from '.';

const swapExecutedArgs = z.intersection(
  z.object({
    swapId: u64,
    intermediateAmount: u128.optional(),
    destinationAsset: internalAssetEnum,
    sourceAsset: internalAssetEnum,
  }),
  z.union([
    // before v1.2.0
    z
      .object({ egressAmount: u128 })
      .transform(({ egressAmount }) => ({ swapOutput: egressAmount })),
    // after v1.2.0
    z.object({ swapOutput: u128 }),
  ]),
);

export type SwapExecutedEvent = z.input<typeof swapExecutedArgs>;

export default async function swapExecuted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId, intermediateAmount, swapOutput, destinationAsset, sourceAsset } =
    swapExecutedArgs.parse(event.args);
  const swap = await prisma.swap.findUnique({
    where: { nativeId: swapId },
  });

  // Some internal swaps do not emit a `SwapScheduled` event. This means that a swap entry will not exist in the db yet.
  if (!swap) {
    // Ignore burn swaps
    if (sourceAsset === 'Usdc' && destinationAsset === 'Flip') {
      return;
    }

    throw new Error(`swapExecuted: No existing swap entity for swap ${swapId}.`);
  }

  const fees = await calculateIncludedSwapFees(
    swap.srcAsset,
    swap.destAsset,
    swap.swapInputAmount.toFixed(),
    intermediateAmount?.toString(),
    swapOutput.toString(),
  );

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      swapOutputAmount: swapOutput.toString(),
      intermediateAmount: intermediateAmount?.toString(),
      fees: {
        create: fees.map((fee) => ({
          type: fee.type,
          asset: getInternalAsset(fee),
          amount: fee.amount,
        })),
      },
      swapExecutedAt: new Date(block.timestamp),
      swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}
