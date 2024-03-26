import { z } from 'zod';
import { u64, internalAssetEnum, u128, hexString } from '@/shared/parsers';
import { getStateChainError } from './common';
import { EventHandlerArgs } from './index';

const swapEgressIgnoredArgs = z.object({
  asset: internalAssetEnum,
  amount: u128,
  swapId: u64,
  reason: z.object({
    __kind: z.literal('Module'),
    value: z.object({
      error: hexString,
      index: z.number(),
    }),
  }),
});

export type SwapDepositAddressReadyEvent = z.input<typeof swapEgressIgnoredArgs>;

export default async function swapEgressIgnored({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const { amount, swapId, reason } = swapEgressIgnoredArgs.parse(event.args);

  const [failure, swap] = await Promise.all([
    getStateChainError(prisma, block, reason.value),
    prisma.swap.findUniqueOrThrow({ where: { nativeId: swapId } }),
  ]);

  await prisma.ignoredEgress.create({
    data: {
      swapId: swap.id,
      ignoredAt: new Date(block.timestamp),
      ignoredBlockIndex: `${block.height}-${event.indexInBlock}`,
      amount: amount.toString(),
      stateChainErrorId: failure.id,
    },
  });
}
