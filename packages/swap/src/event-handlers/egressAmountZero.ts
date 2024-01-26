import { z } from 'zod';
import { assetChains } from '@/shared/enums';
import { u64 } from '@/shared/parsers';
import type { EventHandlerArgs } from '.';

const egressAmountZeroArgs = z.object({
  swapId: u64,
});

export type EgressAmountZeroEvent = z.input<typeof egressAmountZeroArgs>;

export default async function egressAmountZero({
  prisma,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId } = egressAmountZeroArgs.parse(event.args);

  const swap = await prisma.swap.findUniqueOrThrow({
    where: { nativeId: swapId },
    include: { swapDepositChannel: true },
  });

  await prisma.failedSwap.create({
    data: {
      type: 'FAILED',
      reason: 'EgressAmountZero',
      swapDepositChannelId: swap.swapDepositChannelId,
      swapId: swap.id,
      srcChain: assetChains[swap.srcAsset],
      destAddress: swap.destAddress,
      destChain: assetChains[swap.destAsset],
      depositAmount: swap.depositAmount,
    },
  });
}
