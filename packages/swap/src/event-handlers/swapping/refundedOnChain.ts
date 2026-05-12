import { swappingRefundedOnChain as schema210 } from '@chainflip/processor/210/swapping/refundedOnChain';
import { swappingRefundedOnChain as schema220 } from '@chainflip/processor/220/swapping/refundedOnChain';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

const swappingRefundedOnChain = z.union([schema220.strict(), schema210.strict()]);

export type SwappingRefundedOnChainArgs = z.input<typeof swappingRefundedOnChain>;

export default async function refundedOnChain({ prisma, event }: EventHandlerArgs) {
  const { amount, swapRequestId, asset, refundFee } = swappingRefundedOnChain.parse(event.args);

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      onChainSwapInfo: {
        update: {
          refundAmount: amount.toString(),
        },
      },
      fees: {
        create: {
          type: 'REFUND',
          asset,
          amount: refundFee.toString(),
        },
      },
    },
  });
}
