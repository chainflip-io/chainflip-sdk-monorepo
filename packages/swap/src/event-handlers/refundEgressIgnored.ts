import { swappingRefundEgressIgnored } from '@chainflip/processor/150/swapping/refundEgressIgnored';
import { getStateChainError } from './common';
import type { EventHandlerArgs } from './index';

const refundEgressIgnored = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { swapId, amount, reason } = swappingRefundEgressIgnored.parse(event.args);

  let failure;
  if (reason.__kind === 'Module') {
    failure = await getStateChainError(prisma, block, reason.value);
  }

  await prisma.swap.update({
    where: { nativeId: swapId },
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
