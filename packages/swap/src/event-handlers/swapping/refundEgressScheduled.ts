import { swappingRefundEgressScheduled as schema210 } from '@chainflip/processor/210/swapping/refundEgressScheduled';
import { swappingRefundEgressScheduled as schema220 } from '@chainflip/processor/220/swapping/refundEgressScheduled';
import z from 'zod';
import type { EventHandlerArgs } from '../index.js';

const schema = z.union([schema220.strict(), schema210.strict()]);

export type RefundEgressScheduledArgs = z.input<typeof schema>;

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
  } = schema.parse(event.args);

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
