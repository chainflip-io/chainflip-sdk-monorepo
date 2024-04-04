import { bigintMin } from '@/shared/functions';
import { QuoteQueryResponse, SwapFee } from '@/shared/schemas';
import {
  buildFee,
  calculateIncludedSwapFees,
  estimateIngressEgressFeeAssetAmount,
} from '@/swap/utils/fees';
import { estimateSwapDuration } from '@/swap/utils/swap';
import logger from './logger';
import { getMinimumEgressAmount, getEgressFee } from './rpc';
import ServiceError from './ServiceError';
import { getSwapRate } from './statechain';
import { InternalAsset } from '../client';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import { QuoteType } from '../quoting/Leg';

export default async function getPoolQuote(
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  swapInputAmount: bigint,
  ingressEgressFeeIsGasAssetAmount: boolean,
  fees: SwapFee[],
): Promise<QuoteQueryResponse & { quoteType: QuoteType }> {
  const includedFees: SwapFee[] = [...fees];

  const start = performance.now();

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
  if (ingressEgressFeeIsGasAssetAmount) {
    egressFee = await estimateIngressEgressFeeAssetAmount(egressFee, destAsset);
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
    estimatedDurationSeconds: await estimateSwapDuration(srcAsset, destAsset),
  };

  logger.info('finished getting pool quote', {
    response,
    performance: `${(performance.now() - start).toFixed(2)} ms`,
  });

  return response;
}
