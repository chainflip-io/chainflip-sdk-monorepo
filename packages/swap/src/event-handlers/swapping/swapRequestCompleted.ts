import { swappingSwapRequestCompleted as schema200 } from '@chainflip/processor/200/swapping/swapRequestCompleted';
import assert from 'assert';
import { z } from 'zod';
import { isNotNullish } from '@/shared/guards.js';
import { Prisma } from '../../client.js';
import { getAssetPrice } from '../../pricing/index.js';
import { getSwapPrice } from '../../utils/swap.js';
import { EventHandlerArgs } from '../index.js';

const timeElapsedinMinutes = (timestamp: number | string | Date) => {
  const currentTime = new Date();
  const elapsedTime = new Date(timestamp);
  const timeDiff = Math.abs(currentTime.getTime() - elapsedTime.getTime());
  return Math.floor(timeDiff / 60_000);
};

const swappingSwapRequestCompleted = schema200.strict();

export type SwapRequestCompletedArgs = z.input<typeof swappingSwapRequestCompleted>;

export default async function swapRequestCompleted({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const args = swappingSwapRequestCompleted.parse(event.args);
  const { swapRequestId } = args;

  const swapRequest = await prisma.swapRequest.findFirstOrThrow({
    where: { nativeId: swapRequestId },
    include: {
      swaps: {
        select: {
          swapOutputAmount: true,
          oraclePriceDeltaBps: true,
          swapExecutedAt: true,
          swapInputAmount: true,
        },
      },
      swapDepositChannel: { select: { quote: true } },
      liquidationSwapInfo: true,
    },
  });

  const totalSwapOutputAmount = swapRequest.swaps.reduce(
    (acc, { swapOutputAmount }) => acc.plus(swapOutputAmount ?? 0),
    new Prisma.Decimal(0),
  );

  let liquidationSwapInfo = undefined as Prisma.SwapRequestUpdateInput['liquidationSwapInfo'];
  if (swapRequest.liquidationSwapInfo && 'reason' in args) {
    assert(
      swapRequest.swapInputAmount !== null,
      'Liquidation swap input amount should not be null',
    );
    // TODO(WEB-2829): fetch refunded amount from swap request instead of aggregating
    const refundAmount = swapRequest.swaps.reduce(
      (acc, { swapInputAmount }) => acc.minus(swapInputAmount),
      swapRequest.swapInputAmount,
    );

    liquidationSwapInfo = {
      update: {
        refundAmount,
        ...(args.reason === 'Executed' && {
          completedAt: new Date(block.timestamp),
          completedAtBlockIndex: `${block.height}-${event.indexInBlock}`,
        }),
        ...(args.reason === 'Aborted' && {
          abortedAt: new Date(block.timestamp),
          abortedAtBlockIndex: `${block.height}-${event.indexInBlock}`,
        }),
      },
    };
  }

  const oracleSwaps = swapRequest.swaps.filter(({ oraclePriceDeltaBps }) =>
    isNotNullish(oraclePriceDeltaBps),
  );

  const totalOraclePriceDeltaBps = oracleSwaps.reduce(
    (acc, { oraclePriceDeltaBps }) => acc.plus(oraclePriceDeltaBps ?? 0),
    new Prisma.Decimal(0),
  );

  const avgOraclePriceDeltaBps =
    oracleSwaps.length > 0 ? totalOraclePriceDeltaBps.div(oracleSwaps.length) : undefined;

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      completedAt: new Date(block.timestamp),
      completedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapOutputAmount: totalSwapOutputAmount,
      oraclePriceDeltaBps: avgOraclePriceDeltaBps,
      liquidationSwapInfo,
    },
  });

  const channelQuote = swapRequest.swapDepositChannel?.quote;
  if (
    channelQuote &&
    !channelQuote.swapRequestId // do not overwrite data if channel is reused
  ) {
    const [srcPrice, destPrice] =
      timeElapsedinMinutes(block.timestamp) < 1
        ? await Promise.all([
            getAssetPrice(swapRequest.srcAsset),
            getAssetPrice(swapRequest.destAsset),
          ])
        : [];

    const quoteArgs: Prisma.QuoteUpdateArgs['data'] = {
      swapRequestId: swapRequest.id,
      swapRequestNativeId: swapRequest.nativeId,
      inputAssetPriceAtCompletion: srcPrice,
      outputAssetPriceAtCompletion: destPrice,
      indexPriceAtCompletion: srcPrice && destPrice ? srcPrice / destPrice : undefined,
    };

    if (swapRequest.refundEgressId) {
      quoteArgs.refundedAt = new Date(block.timestamp);
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

      quoteArgs.executedAt = new Date(block.timestamp);
      quoteArgs.executedPrice = executedPrice;
      quoteArgs.executedSlippagePercent = executedSlippagePercent;
    }

    await prisma.quote.update({ where: { id: channelQuote.id }, data: quoteArgs });
  }
}
