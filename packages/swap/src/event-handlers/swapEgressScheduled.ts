import { swappingSwapEgressScheduled as schema150 } from '@chainflip/processor/150/swapping/swapEgressScheduled';
import { swappingSwapEgressScheduled as schema160 } from '@chainflip/processor/160/swapping/swapEgressScheduled';
import { z } from 'zod';
import type { EventHandlerArgs } from '.';

const transformOldShape = ({ swapId, fee, ...rest }: z.output<typeof schema150>) => ({
  swapRequestId: swapId,
  egressFee: fee,
  ...rest,
});

const eventArgs = z.union([schema160, schema150.transform(transformOldShape)]);

/**
 * this event is emitted in order to correlate the egress id from a network
 * deposit/egress pallet to a swap id
 */
export default async function swapEgressScheduled({
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
      egress: {
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
