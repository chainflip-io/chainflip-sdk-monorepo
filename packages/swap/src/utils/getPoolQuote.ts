import { bigintMin } from '@/shared/functions';
import { QuoteQueryResponse, SwapFee } from '@/shared/schemas';
import { buildFee, calculateIncludedSwapFees } from '@/swap/utils/fees';
import { estimateSwapDuration } from '@/swap/utils/swap';
import logger from './logger';
import { getMinimumEgressAmount, getEgressFee } from './rpc';
import ServiceError from './ServiceError';
import { getSwapRate } from './statechain';
import { InternalAsset } from '../client';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import { QuoteType } from '../quoting/Quoter';

export default async function getPoolQuote(
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  swapInputAmount: bigint,
  fees: SwapFee[],
  start: number,
): Promise<{ response: QuoteQueryResponse & { quoteType: QuoteType }; duration: number }> {
  const includedFees: SwapFee[] = [...fees];

  const quote = await getSwapRate({ srcAsset, destAsset, amount: swapInputAmount });

  const lowLiquidityWarning = await checkPriceWarning({
    srcAsset,
    destAsset,
    srcAmount: swapInputAmount,
    destAmount: BigInt(quote.outputAmount),
  });

  const quoteSwapFees = await calculateIncludedSwapFees(
    srcAsset,
    destAsset,
    swapInputAmount,
    quote.intermediateAmount,
    quote.outputAmount,
  );
  includedFees.push(...quoteSwapFees);

  let egressFee = await getEgressFee(destAsset);
  if (egressFee == null) {
    throw ServiceError.internalError(`could not determine egress fee for ${destAsset}`);
  }
  egressFee = bigintMin(egressFee, BigInt(quote.outputAmount));
  includedFees.push(buildFee(destAsset, 'EGRESS', egressFee));

  const egressAmount = BigInt(quote.outputAmount) - egressFee;

  const minimumEgressAmount = await getMinimumEgressAmount(destAsset);

  if (egressAmount < minimumEgressAmount) {
    throw ServiceError.badRequest(
      `egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
    );
  }

  const { outputAmount, ...response } = {
    ...quote,
    intermediateAmount: quote.intermediateAmount?.toString(),
    egressAmount: egressAmount.toString(),
    includedFees,
    lowLiquidityWarning,
    estimatedDurationSeconds: await estimateSwapDuration({ srcAsset, destAsset }),
  };

  const duration = performance.now() - start;

  logger.info('finished getting pool quote', { response, duration });

  return { response, duration };
}
