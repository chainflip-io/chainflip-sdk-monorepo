import { z } from 'zod';
import { getInternalAsset } from '@/shared/enums';
import { internalAssetEnum, u128, u64 } from '@/shared/parsers';
import { calculateIncludedSwapFees } from '@/swap/utils/fees';
import { isLocalnet } from '../utils/env';
import type { EventHandlerArgs } from '.';

export const swapTypeEnum = z
  .union([
    z.object({ __kind: z.literal('Swap') }),
    z.object({ __kind: z.literal('CcmPrincipal') }),
    z.object({ __kind: z.literal('CcmGas') }),
    z.object({ __kind: z.literal('NetworkFee') }),
    z.object({ __kind: z.literal('IngressEgressFee') }),
  ])
  .transform(({ __kind }) => __kind);

const swapExecutedArgs = z.intersection(
  z.object({
    swapId: u64,
    intermediateAmount: u128.optional(),
    destinationAsset: internalAssetEnum,
    sourceAsset: internalAssetEnum,
    // >= v1.4.0
    swapType: swapTypeEnum.optional(),
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
  const { swapId, intermediateAmount, swapOutput, swapType } = swapExecutedArgs.parse(event.args);
  const swap = await prisma.swap.findUnique({
    where: { nativeId: swapId },
  });

  // Some internal swaps do not emit a `SwapScheduled` event. This means that a swap entry will not exist in the db yet.
  if (!swap) {
    if (swapType === 'IngressEgressFee' || swapType === 'NetworkFee') {
      return;
    }

    throw new Error(`swapExecuted: No existing swap entity for swap ${swapId}.`);
  }

  const fees = await calculateIncludedSwapFees(
    swap.srcAsset,
    swap.destAsset,
    BigInt(swap.swapInputAmount.toFixed()),
    intermediateAmount,
    swapOutput,
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
