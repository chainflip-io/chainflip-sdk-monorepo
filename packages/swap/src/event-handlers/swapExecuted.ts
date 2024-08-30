import { swappingSwapExecuted as schema150 } from '@chainflip/processor/150/swapping/swapExecuted';
import { swappingSwapExecuted as schema160 } from '@chainflip/processor/160/swapping/swapExecuted';
import { z } from 'zod';
import { getInternalAsset } from '@/shared/enums';
import { calculateIncludedSwapFees } from '@/swap/utils/fees';
import type { EventHandlerArgs } from '.';

const transformOldShape = ({
  swapId,
  swapOutput,
  swapInput,
  swapType,
  ...rest
}: z.output<typeof schema150>) => ({
  swapRequestId: swapId,
  swapId,
  outputAmount: swapOutput,
  inputAmount: swapInput,
  swapType: swapType.__kind,
  networkFee: undefined,
  isLegacy: true,
  brokerFee: null,
  ...rest,
});

const swapExecutedArgs = z.union([
  schema160.transform((args) => ({ ...args, swapType: undefined, isLegacy: false })),
  schema150.transform(transformOldShape),
]);

export type SwapExecutedArgs = z.input<typeof swapExecutedArgs>;
export type SwapExecuted160Args = z.input<typeof schema160>;

export default async function swapExecuted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const {
    swapId,
    swapRequestId,
    inputAmount,
    intermediateAmount,
    outputAmount,
    swapType,
    networkFee,
    isLegacy,
    brokerFee,
  } = swapExecutedArgs.parse(event.args);

  const swap = await prisma.swap.findUnique({
    where: { nativeId: swapId },
  });

  // Some internal swaps did not emit a `SwapScheduled` event. This means that a
  // swap entry will not exist in the db yet.
  if (!swap) {
    if (isLegacy && (swapType === 'IngressEgressFee' || swapType === 'NetworkFee')) {
      return;
    }

    throw new Error(
      `swapExecuted: No existing swap entity for swap "${swapId}", swapRequest "${swapRequestId}".`,
    );
  }

  const fees = (
    await calculateIncludedSwapFees(
      swap.srcAsset,
      swap.destAsset,
      inputAmount,
      intermediateAmount,
      outputAmount,
    )
  ).map((fee) => ({ type: fee.type, asset: getInternalAsset(fee), amount: fee.amount }));

  // >= 1.6 we have a network fee on the event
  if (networkFee) {
    fees.find((fee) => fee.type === 'NETWORK')!.amount = networkFee.toString();
  }

  // >= 1.6 we have a broker fee on the event
  if (brokerFee) {
    fees.push({ type: 'BROKER', asset: swap.srcAsset, amount: brokerFee.toString() });
  }

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      swapInputAmount: inputAmount.toString(),
      swapOutputAmount: outputAmount.toString(),
      intermediateAmount: intermediateAmount?.toString(),
      fees: { create: fees },
      swapExecutedAt: new Date(block.timestamp),
      swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapRequest: isLegacy
        ? {
            update: {
              data: {
                completedAt: new Date(block.timestamp),
                completedBlockIndex: `${block.height}-${event.indexInBlock}`,
              },
            },
          }
        : undefined,
    },
  });
}
