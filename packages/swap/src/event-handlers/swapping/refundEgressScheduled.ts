import { swappingRefundEgressScheduled as schema180 } from '@chainflip/processor/180/swapping/refundEgressScheduled';
import { swappingRefundEgressScheduled as schema190 } from '@chainflip/processor/190/swapping/refundEgressScheduled';
import z from 'zod';
import type { EventHandlerArgs } from '../index';

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
    amount,
  } = eventArgs.parse(event.args);

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      refundEgress: {
        create: {
          nativeId,
          chain,
          amount: amount.toString(),
          scheduledAt: new Date(block.timestamp),
          scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
        },
      },
      fees: {
        create: {
          type: 'EGRESS',
          asset: egressFeeAsset,
          amount: egressFee.toString(),
        },
      },
    },
  });
}
