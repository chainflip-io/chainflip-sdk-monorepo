import { swappingSwapEgressIgnored as schema190 } from '@chainflip/processor/190/swapping/swapEgressIgnored';
import { swappingSwapEgressIgnored as schema210 } from '@chainflip/processor/210/swapping/swapEgressIgnored';
import { z } from 'zod';
import { getStateChainError } from '../common.js';
import { EventHandlerArgs } from '../index.js';

const swapEgressIgnoredArgs = z.union([schema210.strict(), schema190.strict()]);

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
