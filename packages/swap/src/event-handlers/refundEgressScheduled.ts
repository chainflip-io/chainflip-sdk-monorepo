import { swappingRefundEgressScheduled as schema160 } from '@chainflip/processor/160/swapping/refundEgressScheduled';
import { swappingRefundEgressScheduled as schema180 } from '@chainflip/processor/180/swapping/refundEgressScheduled';
import z from 'zod';
import type { EventHandlerArgs } from '.';

const eventArgs = z.union([schema180, schema160]);

export default async function refundEgressScheduled({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const {
    swapRequestId,
    egressId: [chain, nativeId],
    egressFee,
    amount,
    asset,
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
          asset,
          amount: egressFee.toString(),
        },
      },
    },
  });
}
