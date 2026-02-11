import { swappingRefundEgressScheduled as schema11000 } from '@chainflip/processor/11000/swapping/refundEgressScheduled';
import { swappingRefundEgressScheduled as schema210 } from '@chainflip/processor/210/swapping/refundEgressScheduled';
import z from 'zod';
import type { EventHandlerArgs } from '../index.js';

const eventArgs = z.union([schema210.strict(), schema11000.strict()]);

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
    refundFee,
  } = eventArgs.parse(event.args);

  const fees = [
    {
      type: 'EGRESS' as const,
      asset: egressFeeAsset,
      amount: egressFee.toString(),
    },

    {
      type: 'REFUND' as const,
      asset: egressFeeAsset,
      amount: refundFee.toString(),
    },
  ];

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
        create: fees,
      },
    },
  });
}
