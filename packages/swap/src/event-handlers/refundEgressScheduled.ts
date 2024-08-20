import { z } from 'zod';
import { internalAssetEnum, u128, u64 } from '@/shared/parsers';
import { egressId } from '@/swap/event-handlers/common';
import type { EventHandlerArgs } from '.';

const eventArgs = z.object({
  asset: internalAssetEnum,
  amount: u128,
  swapId: u64,
  egressId,
  egressFee: u128,
});

export default async function refundEgressScheduled({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const {
    swapId,
    egressId: [chain, nativeId],
    egressFee,
    amount,
  } = eventArgs.parse(event.args);

  const swap = await prisma.swap.findUniqueOrThrow({
    where: { nativeId: swapId },
  });

  await prisma.swapRequest.update({
    where: { nativeId: swapId },
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
          asset: swap.srcAsset,
          amount: egressFee.toString(),
        },
      },
    },
  });
}
