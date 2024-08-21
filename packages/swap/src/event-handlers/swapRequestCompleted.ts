import { swappingSwapRequestCompleted } from '@chainflip/processor/160/swapping/swapRequestCompleted';
import { EventHandlerArgs } from '.';

export default async function swapRequestCompleted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapRequestId } = swappingSwapRequestCompleted.parse(event.args);

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      completedAt: new Date(block.timestamp),
      completedBlockIndex: `${block.height}-${event.indexInBlock}`,
    },
  });
}
