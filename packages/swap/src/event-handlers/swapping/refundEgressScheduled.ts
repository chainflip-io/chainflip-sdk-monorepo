import { swappingRefundEgressScheduled as schema11000 } from '@chainflip/processor/11000/swapping/refundEgressScheduled';
import { swappingRefundEgressScheduled as schema190 } from '@chainflip/processor/190/swapping/refundEgressScheduled';
import z from 'zod';
import type { EventHandlerArgs } from '../index.js';

const eventArgs = z.union([schema11000, schema190]);

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
    refundFee,
    amount: egressAmount,
  } = eventArgs.parse(event.args);

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
          ...(refundFee > 0n
            ? [
                {
                  type: 'REFUND' as const,
                  asset: egressFeeAsset,
                  amount: refundFee.toString(), // check .toFixed()
                },
              ]
            : []),
        ],
      },
    },
  });
}
