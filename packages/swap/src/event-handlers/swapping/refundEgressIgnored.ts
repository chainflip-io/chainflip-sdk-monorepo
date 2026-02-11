import { swappingRefundEgressIgnored as schema190 } from '@chainflip/processor/190/swapping/refundEgressIgnored';
import { swappingRefundEgressIgnored as schema210 } from '@chainflip/processor/210/swapping/refundEgressIgnored';
import z from 'zod';
import { getStateChainError } from '../common.js';
import type { EventHandlerArgs } from '../index.js';

const swappingRefundEgressIgnored = z.union([schema210.strict(), schema190.strict()]);

export type RefundEgressIgnoredArgs = z.input<typeof swappingRefundEgressIgnored>;

const refundEgressIgnored = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { swapRequestId, amount, reason } = swappingRefundEgressIgnored.parse(event.args);

  let failure;
  if (reason.__kind === 'Module') {
    failure = await getStateChainError(prisma, block, reason.value);
  }

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      ignoredEgresses: {
        create: {
          ignoredAt: new Date(block.timestamp),
          ignoredBlockIndex: `${block.height}-${event.indexInBlock}`,
          stateChainError: { connect: { id: failure?.id } },
          amount: amount.toString(),
          type: 'REFUND',
        },
      },
    },
  });
};

export default refundEgressIgnored;
