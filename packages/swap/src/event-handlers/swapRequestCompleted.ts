import { swappingSwapRequestCompleted } from '@chainflip/processor/160/swapping/swapRequestCompleted';
import { Prisma } from '../client';
import { getSwapPrice } from '../utils/swap';
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
    channelQuote?.expectedDepositAmount.toFixed(0) === swapRequest.depositAmount?.toFixed(0) &&
    !channelQuote.swapRequestId // do not overwrite data if channel is reused
  ) {
    if (swapRequest.refundEgressId) {
      await prisma.quote.update({
        where: { id: channelQuote.id },
        data: {
          refundedAt: new Date(block.timestamp),
          swapRequestId: swapRequest.id,
          swapRequestNativeId: swapRequest.nativeId,
        },
      });
    } else {
      const quotedPrice = channelQuote.quotedPrice.toNumber();
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
          swapRequestNativeId: swapRequest.nativeId,
        },
      });
    }
  }
}
