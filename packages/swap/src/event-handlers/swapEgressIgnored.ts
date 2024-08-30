import { swappingSwapEgressIgnored as schema150 } from '@chainflip/processor/150/swapping/swapEgressIgnored';
import { swappingSwapEgressIgnored as schema160 } from '@chainflip/processor/160/swapping/swapEgressIgnored';
import { z } from 'zod';
import { getStateChainError } from './common';
import { EventHandlerArgs } from './index';

const transformOldShape = ({ swapId, ...rest }: z.output<typeof schema150>) => ({
  swapRequestId: swapId,
  ...rest,
});

const swapEgressIgnoredArgs = z.union([schema160, schema150.transform(transformOldShape)]);

export type SwapEgressIgnoredArgs = z.input<typeof swapEgressIgnoredArgs>;

export default async function swapEgressIgnored({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const { amount, swapRequestId, reason } = swapEgressIgnoredArgs.parse(event.args);

  const failure = await (reason.__kind === 'Module'
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
      }));

  await prisma.ignoredEgress.create({
    data: {
      ignoredAt: new Date(block.timestamp),
      ignoredBlockIndex: `${block.height}-${event.indexInBlock}`,
      amount: amount.toString(),
      stateChainError: { connect: { id: failure.id } },
      swapRequest: { connect: { nativeId: swapRequestId } },
      type: 'SWAP',
    },
  });
}
