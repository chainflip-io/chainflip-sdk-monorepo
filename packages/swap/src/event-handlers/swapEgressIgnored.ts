import { swappingSwapEgressIgnored as schema141 } from '@chainflip/processor/141/swapping/swapEgressIgnored';
import { swappingSwapEgressIgnored as schema150 } from '@chainflip/processor/150/swapping/swapEgressIgnored';
import { swappingSwapEgressIgnored as schema160 } from '@chainflip/processor/160/swapping/swapEgressIgnored';
import { z } from 'zod';
import { getStateChainError } from './common';
import { EventHandlerArgs } from './index';

const transformOldShape = ({ swapId, ...rest }: z.output<typeof schema141 | typeof schema150>) => ({
  swapRequestId: swapId,
  ...rest,
});

const swapEgressIgnoredArgs = z.union([
  schema160,
  schema150.transform(transformOldShape),
  schema141.transform(transformOldShape),
]);

export type SwapDepositAddressReadyEvent = z.input<typeof swapEgressIgnoredArgs>;

export default async function swapEgressIgnored({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const { amount, swapRequestId, reason } = swapEgressIgnoredArgs.parse(event.args);

  const failurePromise =
    reason.__kind === 'Module'
      ? getStateChainError(prisma, block, reason.value)
      : prisma.stateChainError.upsert({
          where: {
            specVersion_palletIndex_errorIndex: { specVersion: 0, palletIndex: 0, errorIndex: 0 },
          },
          create: {
            specVersion: 0,
            palletIndex: 0,
            errorIndex: 0,
            docs: 'Unknown error',
            name: 'Unknown error',
          },
          update: {},
        });

  const [failure, swapRequest] = await Promise.all([
    failurePromise,
    prisma.swapRequest.findUniqueOrThrow({ where: { nativeId: swapRequestId } }),
  ]);

  await prisma.ignoredEgress.create({
    data: {
      swapRequestId: swapRequest.id,
      ignoredAt: new Date(block.timestamp),
      ignoredBlockIndex: `${block.height}-${event.indexInBlock}`,
      amount: amount.toString(),
      stateChainErrorId: failure.id,
      type: 'SWAP',
    },
  });
}
