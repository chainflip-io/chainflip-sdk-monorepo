import { swappingRefundEgressIgnored } from '@chainflip/processor/160/swapping/refundEgressIgnored';
import { getStateChainError } from './common';
import type { EventHandlerArgs } from './index';

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
