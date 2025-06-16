import { swappingRefundedOnChain as schema11000 } from '@chainflip/processor/11000/swapping/refundedOnChain';
import { swappingRefundedOnChain as schema190 } from '@chainflip/processor/190/swapping/refundedOnChain';
import z from 'zod';
import { EventHandlerArgs } from '../index.js';

const swappingRefundedOnChain = z.union([
  schema11000,
  schema190.transform(({ ...args }) => ({ ...args, refundFee: undefined })),
]);

export type SwappingRefundedOnChainArgs = z.input<typeof swappingRefundedOnChain>;

export default async function refundedOnChain({ prisma, event }: EventHandlerArgs) {
  const {
    amount,
    swapRequestId,
    asset,
    refundFee: protocolRefundFee,
  } = swappingRefundedOnChain.parse(event.args);

  let refundFeeAmount: string | null = null;

  if (!protocolRefundFee) {
    const [aggregate, swapRequest] = await Promise.all([
      prisma.swap.aggregate({
        where: { swapRequest: { nativeId: swapRequestId }, swapExecutedBlockIndex: { not: null } },
        _sum: { swapInputAmount: true },
      }),
      prisma.swapRequest.findUniqueOrThrow({ where: { nativeId: swapRequestId } }),
    ]);

    const refundFee = swapRequest.swapInputAmount
      .minus(aggregate._sum.swapInputAmount ?? 0)
      .minus(amount.toString());

    if (refundFee.gt(0)) {
      refundFeeAmount = refundFee.toFixed();
    }
  } else {
    refundFeeAmount = Number(protocolRefundFee).toFixed();
  }

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      onChainSwapInfo: {
        update: {
          refundAmount: amount.toString(),
        },
      },
      ...(refundFeeAmount && {
        fees: {
          create: {
            type: 'REFUND',
            asset,
            amount: refundFeeAmount,
          },
        },
      }),
    },
  });
}
