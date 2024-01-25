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
  const channel = swap.swapDepositChannel;

  if (!channel) {
    throw new Error('Swap deposit channel not found');
  }

  await prisma.failedSwap.create({
    data: {
      type: 'FAILED',
      reason: 'EgressAmountZero',
      swapDepositChannelId: channel.id,
      srcChain: channel.srcChain,
      destAddress: channel.destAddress,
      destChain: assetChains[channel.destAsset],
      depositAmount: channel.expectedDepositAmount ?? '0',
    },
  });
}
