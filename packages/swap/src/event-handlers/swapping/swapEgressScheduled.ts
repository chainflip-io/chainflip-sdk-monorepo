import { swappingSwapEgressScheduled as schema180 } from '@chainflip/processor/180/swapping/swapEgressScheduled';
import { swappingSwapEgressScheduled as schema190 } from '@chainflip/processor/190/swapping/swapEgressScheduled';
import { chainConstants } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import type { EventHandlerArgs } from '..';

const eventArgs = z.union([schema190, schema180]);

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
    egressFee,
    amount,
    asset,
  } = eventArgs.parse(event.args);

  const request = await prisma.swapRequest.findUniqueOrThrow({
    where: { nativeId: swapRequestId },
  });

  const egressFeeAsset =
    egressFee[1] ?? (request.requestType === 'LEGACY_CCM' ? chainConstants[chain].gasAsset : asset);

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
          amount: egressFee[0].toString(),
        },
      },
    },
  });
}
