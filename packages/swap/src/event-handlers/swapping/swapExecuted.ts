import { swappingSwapExecuted as schema160 } from '@chainflip/processor/160/swapping/swapExecuted';
import { swappingSwapExecuted as schema190 } from '@chainflip/processor/190/swapping/swapExecuted';
import { getInternalAsset } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { calculateIncludedSwapFees } from '../../utils/fees';
import type { EventHandlerArgs } from '../index';

const swapExecutedArgs = z.union([schema190, schema160]);

export type SwapExecutedArgs = z.input<typeof swapExecutedArgs>;

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
    networkFee,
    brokerFee,
  } = swapExecutedArgs.parse(event.args);

  const swap = await prisma.swap.findUnique({
    where: { nativeId: swapId },
  });

  if (!swap) {
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
    fees.push({ type: 'BROKER', asset: 'Usdc', amount: brokerFee.toString() });
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
    },
  });
}
