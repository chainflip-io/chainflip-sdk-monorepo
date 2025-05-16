import { swappingRefundedOnChain } from '@chainflip/processor/190/swapping/refundedOnChain';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

export type SwappingRefundedOnChainArgs = z.input<typeof swappingRefundedOnChain>;

export default async function refundedOnChain({ prisma, event }: EventHandlerArgs) {
  const { amount, swapRequestId, asset } = swappingRefundedOnChain.parse(event.args);

  const [aggregate, swapRequest] = await Promise.all([
    prisma.swap.aggregate({
      where: { swapRequest: { nativeId: swapRequestId }, swapExecutedBlockIndex: { not: null } },
      _sum: { swapInputAmount: true },
    }),
    prisma.swapRequest.findUniqueOrThrow({ where: { nativeId: swapRequestId } }),
  ]);

  const refundFee = swapRequest.depositAmount
    ?.minus(aggregate._sum.swapInputAmount ?? 0)
    .minus(amount.toString());

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      onChainSwapInfo: {
        update: {
          refundAmount: amount.toString(),
        },
      },
      ...(refundFee?.gt(0) && {
        fees: {
          create: {
            type: 'REFUND',
            asset,
            amount: refundFee.toFixed(),
          },
        },
      }),
    },
  });
}
