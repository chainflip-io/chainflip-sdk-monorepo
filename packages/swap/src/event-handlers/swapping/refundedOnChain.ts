import { swappingRefundedOnChain as schema11000 } from '@chainflip/processor/11000/swapping/refundedOnChain';
import { swappingRefundedOnChain as schema190 } from '@chainflip/processor/190/swapping/refundedOnChain';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

const swappingRefundedOnChain = z.union([schema11000, schema190]);

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
      ...(refundFee > 0n && {
        fees: {
          create: {
            type: 'REFUND',
            asset,
            amount: refundFee.toString(),
          },
        },
      }),
    },
  });
}
