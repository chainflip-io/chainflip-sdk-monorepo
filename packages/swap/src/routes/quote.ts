import { z } from 'zod';
import { getInternalAsset } from '@/shared/enums';
import { bigintMin, getPipAmountFromAmount } from '@/shared/functions';
import { QuoteQueryResponse, quoteQuerySchema, SwapFee } from '@/shared/schemas';
import { calculateIncludedSwapFees, estimateIngressEgressFeeAssetAmount } from '@/swap/utils/fees';
import { estimateSwapDuration } from '@/swap/utils/swap';
import { checkPriceWarning } from '../pricing/checkPriceWarning';
import logger from '../utils/logger';
import { getMinimumEgressAmount, getEgressFee, getIngressFee } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';
import { getBrokerQuote } from '../utils/statechain';

export default async function buildPoolQuote(
  queryResult: z.SafeParseSuccess<z.output<typeof quoteQuerySchema>>,
  ingressEgressFeeIsGasAssetAmount: boolean,
): Promise<QuoteQueryResponse> {
  const query = queryResult.data;
  const srcChainAsset = { asset: query.srcAsset, chain: query.srcChain };
  const destChainAsset = { asset: query.destAsset, chain: query.destChain };

  const includedFees: SwapFee[] = [];

  let swapInputAmount = query.amount;

  if (query.boostFeeBps) {
    const boostFee = getPipAmountFromAmount(swapInputAmount, query.boostFeeBps);
    includedFees.push({
      type: 'BOOST',
      chain: srcChainAsset.chain,
      asset: srcChainAsset.asset,
      amount: boostFee.toString(),
    });
    swapInputAmount -= boostFee;
  }

  let ingressFee = await getIngressFee(srcChainAsset);
  if (ingressFee == null) {
    throw ServiceError.internalError(
      `could not determine ingress fee for ${getInternalAsset(srcChainAsset)}`,
    );
  }
  if (ingressEgressFeeIsGasAssetAmount) {
    ingressFee = await estimateIngressEgressFeeAssetAmount(
      ingressFee,
      getInternalAsset(srcChainAsset),
    );
  }
  includedFees.push({
    type: 'INGRESS',
    chain: srcChainAsset.chain,
    asset: srcChainAsset.asset,
    amount: ingressFee.toString(),
  });
  swapInputAmount -= ingressFee;
  if (swapInputAmount <= 0n) {
    throw ServiceError.badRequest(`amount is lower than estimated ingress fee (${ingressFee})`);
  }

  if (query.brokerCommissionBps) {
    const brokerFee = getPipAmountFromAmount(swapInputAmount, query.brokerCommissionBps);
    includedFees.push({
      type: 'BROKER',
      chain: srcChainAsset.chain,
      asset: srcChainAsset.asset,
      amount: brokerFee.toString(),
    });
    swapInputAmount -= brokerFee;
  }

  const start = performance.now();

  const bestQuote = await getBrokerQuote({ ...query, amount: swapInputAmount });

  const lowLiquidityWarning = await checkPriceWarning({
    srcAsset: getInternalAsset(srcChainAsset),
    destAsset: getInternalAsset(destChainAsset),
    srcAmount: swapInputAmount,
    destAmount: BigInt(bestQuote.outputAmount),
  });

  const quoteSwapFees = await calculateIncludedSwapFees(
    getInternalAsset(srcChainAsset),
    getInternalAsset(destChainAsset),
    swapInputAmount,
    bestQuote.intermediateAmount,
    bestQuote.outputAmount,
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
  egressFee = bigintMin(egressFee, BigInt(bestQuote.outputAmount));
  includedFees.push({
    type: 'EGRESS',
    chain: destChainAsset.chain,
    asset: destChainAsset.asset,
    amount: egressFee.toString(),
  });

  const egressAmount = BigInt(bestQuote.outputAmount) - egressFee;

  const minimumEgressAmount = await getMinimumEgressAmount(destChainAsset);

  if (egressAmount < minimumEgressAmount) {
    throw ServiceError.badRequest(
      `egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
    );
  }

  const {
    id = undefined,
    outputAmount,
    quoteType,
    ...response
  } = {
    ...bestQuote,
    intermediateAmount: bestQuote.intermediateAmount?.toString(),
    egressAmount: egressAmount.toString(),
    includedFees,
    lowLiquidityWarning,
    estimatedDurationSeconds: await estimateSwapDuration(srcChainAsset.chain, destChainAsset.chain),
  };

  logger.info('sending response for quote request', {
    id,
    quoteType,
    response,
    performance: `${(performance.now() - start).toFixed(2)} ms`,
  });

  return response;
}
