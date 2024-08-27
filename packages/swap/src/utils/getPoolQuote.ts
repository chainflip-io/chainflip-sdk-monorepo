import BigNumber from 'bignumber.js';
import { assetConstants, getAssetAndChain, getInternalAsset } from '@/shared/enums';
import { getPipAmountFromAmount } from '@/shared/functions';
import { QuoteQueryResponse } from '@/shared/schemas';
import { estimateSwapDuration } from '@/swap/utils/swap';
import { buildFee, getPoolFees } from './fees';
import { getEgressFee, getMinimumEgressAmount } from './rpc';
import ServiceError from './ServiceError';
import { LimitOrders, getSwapRateV2 } from './statechain';
import { InternalAsset, Pool } from '../client';
import { checkPriceWarning } from '../pricing/checkPriceWarning';

const getPrice = (
  inputAmount: bigint,
  inputAsset: InternalAsset,
  outputAmount: bigint,
  outputAsset: InternalAsset,
) => {
  const input = BigNumber(String(inputAmount)).shiftedBy(-assetConstants[inputAsset].decimals);
  const output = BigNumber(String(outputAmount)).shiftedBy(-assetConstants[outputAsset].decimals);

  return output.div(input).toFixed();
};

export default async function getPoolQuote({
  srcAsset,
  destAsset,
  swapInputAmount: originalSwapInputAmount,
  limitOrders,
  boostFeeBps,
  brokerCommissionBps,
  pools,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  swapInputAmount: bigint;
  brokerCommissionBps?: number;
  limitOrders?: LimitOrders;
  boostFeeBps?: number;
  pools: Pool[];
}): Promise<QuoteQueryResponse> {
  const includedFees = [];
  let swapInputAmount = originalSwapInputAmount;

  const brokerFee =
    brokerCommissionBps && getPipAmountFromAmount(swapInputAmount, brokerCommissionBps);

  if (brokerFee) {
    includedFees.push(buildFee(srcAsset, 'BROKER', brokerFee));
    swapInputAmount -= brokerFee;
  }

  if (boostFeeBps) {
    const boostFee = getPipAmountFromAmount(swapInputAmount, boostFeeBps);
    includedFees.push(buildFee(srcAsset, 'BOOST', boostFee));
    swapInputAmount -= boostFee;
  }

  const {
    egressFee,
    ingressFee,
    networkFee,
    outputAmount: swapOutputAmount,
    intermediateAmount,
  } = await getSwapRateV2({
    srcAsset,
    destAsset,
    amount: swapInputAmount,
    limitOrders,
  });

  const minimumEgressAmount = await getMinimumEgressAmount(destAsset);

  if (swapOutputAmount === 0n) {
    if (networkFee.amount === 0n) {
      // this shouldn't happen because we check before but i'll keep it here anyway
      throw ServiceError.badRequest('swap amount is lower than ingress fee');
    }

    const rpcEgressFee = await getEgressFee(destAsset);
    throw ServiceError.badRequest(
      `swap output amount is lower than the egress fee (${rpcEgressFee})`,
    );
  }

  if (swapOutputAmount < minimumEgressAmount) {
    throw ServiceError.badRequest(
      `egress amount (${swapOutputAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
    );
  }

  const lowLiquidityWarning = await checkPriceWarning({
    srcAsset,
    destAsset,
    srcAmount: swapInputAmount,
    destAmount: swapOutputAmount,
  });

  includedFees.push(
    buildFee(getInternalAsset(ingressFee), 'INGRESS', ingressFee.amount),
    buildFee('Usdc', 'NETWORK', networkFee.amount),
    buildFee(getInternalAsset(egressFee), 'EGRESS', egressFee.amount),
  );

  const poolInfo = getPoolFees(srcAsset, destAsset, swapInputAmount, intermediateAmount, pools).map(
    ({ type, ...fee }, i) => ({
      baseAsset: getAssetAndChain(pools[i].baseAsset),
      quoteAsset: getAssetAndChain(pools[i].quoteAsset),
      fee,
    }),
  );

  return {
    intermediateAmount: intermediateAmount?.toString(),
    egressAmount: swapOutputAmount.toString(),
    includedFees,
    lowLiquidityWarning,
    poolInfo,
    estimatedDurationSeconds: await estimateSwapDuration({
      srcAsset,
      destAsset,
      boosted: Boolean(boostFeeBps),
    }),
    estimatedPrice: getPrice(swapInputAmount, srcAsset, swapOutputAmount, destAsset),
  };
}
