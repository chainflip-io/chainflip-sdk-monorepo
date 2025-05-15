import { swappingRefundEgressScheduled as schema180 } from '@chainflip/processor/180/swapping/refundEgressScheduled';
import { swappingRefundEgressScheduled as schema190 } from '@chainflip/processor/190/swapping/refundEgressScheduled';
import z from 'zod';
import type { EventHandlerArgs } from '../index.js';
import { Prisma } from '../../client.js';

const eventArgs = z.union([schema190, schema180]);

export type RefundEgressScheduledArgs = z.input<typeof eventArgs>;

export default async function refundEgressScheduled({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const {
    swapRequestId,
    egressId: [chain, nativeId],
    egressFee: [egressFee, egressFeeAsset],
    amount: egressAmount,
  } = eventArgs.parse(event.args);

  const [aggregate, swapRequest] = await Promise.all([
    prisma.swap.aggregate({
      where: { swapRequest: { nativeId: swapRequestId }, swapExecutedBlockIndex: { not: null } },
      _sum: { swapInputAmount: true },
    }),
    prisma.swapRequest.findUniqueOrThrow({
      where: { nativeId: swapRequestId },
      include: { fees: { where: { type: 'INGRESS' } } },
    }),
  ]);

  const refundFee = swapRequest
    .depositAmount!.minus(aggregate._sum.swapInputAmount ?? 0)
    .minus(egressAmount?.toString() ?? 0)
    .minus(egressFee?.toString() ?? 0)
    .minus(swapRequest.fees.reduce((acc, fee) => acc.plus(fee.amount), new Prisma.Decimal(0)));

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      refundEgress: {
        create: {
          nativeId,
          chain,
          amount: egressAmount.toString(),
          scheduledAt: new Date(block.timestamp),
          scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
        },
      },
      fees: {
        create: [
          {
            type: 'EGRESS',
            asset: egressFeeAsset,
            amount: egressFee.toString(),
          },
          ...(refundFee.gt(0)
            ? [
                {
                  type: 'REFUND' as const,
                  asset: egressFeeAsset,
                  amount: refundFee.toFixed(),
                },
              ]
            : []),
        ],
      },
    },
  });
}
