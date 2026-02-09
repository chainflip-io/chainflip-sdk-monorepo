import { swappingSwapExecuted as schema11100 } from '@chainflip/processor/11100/swapping/swapExecuted';
import { swappingSwapExecuted as schema210 } from '@chainflip/processor/210/swapping/swapExecuted';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const swapExecutedArgs = z.union([schema210.strict(), schema11100.strict()]);

export type SwapExecutedArgs = z.input<typeof swapExecutedArgs>;

export default async function swapExecuted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const {
    swapId,
    inputAmount,
    intermediateAmount,
    outputAmount,
    networkFee,
    brokerFee,
    oracleDelta,
  } = swapExecutedArgs.parse(event.args);

  const fees = [];

  // >= 1.6 we have a network fee on the event
  if (networkFee) {
    fees.push({ type: 'NETWORK', asset: 'Usdc', amount: networkFee.toString() } as const);
  }

  // >= 1.6 we have a broker fee on the event
  if (brokerFee) {
    fees.push({ type: 'BROKER', asset: 'Usdc', amount: brokerFee.toString() } as const);
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
      latestSwapRescheduledAt: null,
      latestSwapRescheduledBlockIndex: null,
      latestSwapRescheduledReason: null,
      oraclePriceDeltaBps: oracleDelta,
    },
  });
}
