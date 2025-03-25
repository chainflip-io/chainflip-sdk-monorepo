import { swappingSwapEgressIgnored } from '@chainflip/processor/160/swapping/swapEgressIgnored';
import { z } from 'zod';
import { getStateChainError } from '../common';
import { EventHandlerArgs } from '../index';

const swapEgressIgnoredArgs = swappingSwapEgressIgnored;

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
