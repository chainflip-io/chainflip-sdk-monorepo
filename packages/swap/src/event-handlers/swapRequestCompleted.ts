import { swappingSwapRequestCompleted } from '@chainflip/processor/160/swapping/swapRequestCompleted';
import { Prisma } from '@/swap/client';
import { getSwapPrice } from '@/swap/utils/swap';
import { EventHandlerArgs } from '.';

export default async function swapRequestCompleted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapRequestId } = swappingSwapRequestCompleted.parse(event.args);
  const swapRequest = await prisma.swapRequest.findFirstOrThrow({
    where: { nativeId: swapRequestId },
    include: {
      swaps: { select: { swapOutputAmount: true } },
      swapDepositChannel: { select: { quote: true } },
    },
  });

  const totalSwapOutputAmount = swapRequest.swaps.reduce(
    (acc, { swapOutputAmount }) => acc.plus(swapOutputAmount ?? 0),
    new Prisma.Decimal(0),
  );

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      completedAt: new Date(block.timestamp),
      completedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapOutputAmount: totalSwapOutputAmount,
    },
  });

  const channelQuote = swapRequest.swapDepositChannel?.quote;
  if (
    channelQuote &&
    channelQuote?.depositAmount.toFixed(0) === swapRequest.depositAmount?.toFixed(0) &&
    !channelQuote.swapRequestId && // do not overwrite data if channel is reused
    !swapRequest.refundEgressId // only store execution price if full deposit amount was swapped
  ) {
    const quotedPrice = channelQuote.estimatedPrice.toNumber();
    const executedPrice = Number(
      getSwapPrice(
        swapRequest.srcAsset,
        swapRequest.swapInputAmount.toFixed(),
        swapRequest.destAsset,
        totalSwapOutputAmount.toFixed(),
      ),
    );
    const executedSlippagePercent = (100 * (quotedPrice - executedPrice)) / quotedPrice;

    await prisma.quote.update({
      where: { id: channelQuote.id },
      data: {
        executedAt: new Date(block.timestamp),
        executedPrice,
        executedSlippagePercent,
        swapRequestId: swapRequest.id,
      },
    });
  }
}
