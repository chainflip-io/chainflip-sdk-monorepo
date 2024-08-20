import { swappingRefundEgressIgnored as schema150 } from '@chainflip/processor/150/swapping/refundEgressIgnored';
import { swappingRefundEgressIgnored as schema160 } from '@chainflip/processor/160/swapping/refundEgressIgnored';
import z from 'zod';
import { getStateChainError } from './common';
import type { EventHandlerArgs } from './index';

const swappingRefundEgressIgnored = z.union([
  schema160,
  schema150.transform(({ swapId, ...rest }) => ({ swapRequestId: swapId, ...rest })),
]);

const refundEgressIgnored = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { swapRequestId, amount, reason } = swappingRefundEgressIgnored.parse(event.args);

  let failure;
  if (reason.__kind === 'Module') {
    failure = await getStateChainError(prisma, block, reason.value);
  }

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      ignoredEgress: {
        create: {
          ignoredAt: new Date(block.timestamp),
          ignoredBlockIndex: `${block.height}-${event.indexInBlock}`,
          stateChainErrorId: failure?.id,
          amount: amount.toString(),
          type: 'REFUND',
        },
      },
    },
  });
};

export default refundEgressIgnored;
