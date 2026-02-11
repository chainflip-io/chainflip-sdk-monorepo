import { swappingSwapEgressScheduled as schema190 } from '@chainflip/processor/190/swapping/swapEgressScheduled';
import { swappingSwapEgressScheduled as schema210 } from '@chainflip/processor/210/swapping/swapEgressScheduled';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const eventArgs = z.union([schema210.strict(), schema190.strict()]);

export type SwapEgressScheduledArgs = z.input<typeof eventArgs>;

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
    egressFee: [egressFee, egressFeeAsset],
    amount,
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
          asset: egressFeeAsset,
          amount: egressFee.toString(),
        },
      },
    },
  });
}
