import { z } from 'zod';
import { getInternalAsset } from '@/shared/enums';
import { bigintMin } from '@/shared/functions';
import { QuoteQueryResponse, quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { calculateIncludedSwapFees, estimateIngressEgressFeeAssetAmount } from '@/swap/utils/fees';
import { estimateSwapDuration } from '@/swap/utils/swap';
import logger from './logger';
import { getMinimumEgressAmount, getEgressFee } from './rpc';
import ServiceError from './ServiceError';
import { getBrokerQuote } from './statechain';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import { QuoteType } from '../quoting/quotes';

export default async function getPoolQuote(
  query: z.output<typeof quoteQuerySchema>,
  ingressEgressFeeIsGasAssetAmount: boolean,
  fees: SwapFee[],
): Promise<QuoteQueryResponse & { quoteType: QuoteType }> {
  const srcChainAsset = { asset: query.srcAsset, chain: query.srcChain };
  const destChainAsset = { asset: query.destAsset, chain: query.destChain };

  const includedFees: SwapFee[] = [...fees];

  const swapInputAmount = query.amount;

  const start = performance.now();

  const quote = await getBrokerQuote({ ...query, amount: swapInputAmount });

  const lowLiquidityWarning = await checkPriceWarning({
    srcAsset: getInternalAsset(srcChainAsset),
    destAsset: getInternalAsset(destChainAsset),
    srcAmount: swapInputAmount,
    destAmount: BigInt(quote.outputAmount),
  });

  const quoteSwapFees = await calculateIncludedSwapFees(
    getInternalAsset(srcChainAsset),
    getInternalAsset(destChainAsset),
    swapInputAmount,
    quote.intermediateAmount,
    quote.outputAmount,
  );
  includedFees.push(...quoteSwapFees);

  let egressFee = await getEgressFee(destChainAsset);
  if (egressFee == null) {
    throw ServiceError.internalError(
      `could not determine egress fee for ${getInternalAsset(destChainAsset)}`,
    );
  }
  if (ingressEgressFeeIsGasAssetAmount) {
    egressFee = await estimateIngressEgressFeeAssetAmount(
      egressFee,
      getInternalAsset(destChainAsset),
    );
  }
  egressFee = bigintMin(egressFee, BigInt(quote.outputAmount));
  includedFees.push({
    type: 'EGRESS',
    chain: destChainAsset.chain,
    asset: destChainAsset.asset,
    amount: egressFee.toString(),
  });

  const egressAmount = BigInt(quote.outputAmount) - egressFee;

  const minimumEgressAmount = await getMinimumEgressAmount(destChainAsset);

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
    estimatedDurationSeconds: await estimateSwapDuration(srcChainAsset.chain, destChainAsset.chain),
  };

  logger.info('finished getting pool quote', {
    response,
    performance: `${(performance.now() - start).toFixed(2)} ms`,
  });

  return response;
}
