import BigNumber from 'bignumber.js';
import { assetConstants, getAssetAndChain, getInternalAsset } from '@/shared/enums';
import { getPipAmountFromAmount } from '@/shared/functions';
import { Quote, QuoteType } from '@/shared/schemas';
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

export default async function getPoolQuote<T extends QuoteType>({
  srcAsset,
  destAsset,
  depositAmount,
  limitOrders,
  boostFeeBps,
  brokerCommissionBps,
  pools,
  quoteType,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  depositAmount: bigint;
  brokerCommissionBps?: number;
  limitOrders?: LimitOrders;
  boostFeeBps?: number;
  pools: Pool[];
  quoteType: T;
}): Promise<Extract<Quote, { type: T }>> {
  const includedFees = [];
  let swapInputAmount = depositAmount;

  if (boostFeeBps) {
    const boostFee = getPipAmountFromAmount(swapInputAmount, boostFeeBps);
    includedFees.push(buildFee(srcAsset, 'BOOST', boostFee));
    swapInputAmount -= boostFee;
  }

  const { egressFee, ingressFee, networkFee, egressAmount, intermediateAmount, brokerFee } =
    await getSwapRateV2({
      srcAsset,
      destAsset,
      amount: swapInputAmount,
      limitOrders,
      brokerCommissionBps,
    });

  if (ingressFee) {
    swapInputAmount -= ingressFee.amount;
  }
  if (brokerFee) {
    includedFees.push(buildFee('Usdc', 'BROKER', brokerFee));
  }

  if (egressAmount === 0n) {
    if (networkFee.amount === 0n) {
      // this shouldn't happen because we check before but i'll keep it here anyway
      throw ServiceError.badRequest('swap amount is lower than ingress fee');
    }

    const rpcEgressFee = await getEgressFee(destAsset);
    throw ServiceError.badRequest(
      `swap output amount is lower than the egress fee (${rpcEgressFee})`,
    );
  }

  const minimumEgressAmount = await getMinimumEgressAmount(destAsset);
  if (egressAmount < minimumEgressAmount) {
    throw ServiceError.badRequest(
      `egress amount (${egressAmount}) is lower than minimum egress amount (${minimumEgressAmount})`,
    );
  }

  const swapOutputAmount = egressAmount + egressFee.amount;
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
    egressAmount: egressAmount.toString(),
    includedFees,
    lowLiquidityWarning,
    poolInfo,
    estimatedDurationSeconds: await estimateSwapDuration({
      srcAsset,
      destAsset,
      boosted: Boolean(boostFeeBps),
    }),
    estimatedPrice: getPrice(swapInputAmount, srcAsset, swapOutputAmount, destAsset),
    type: quoteType,
  } as Extract<Quote, { type: T }>; // a little casteroo because dca params isn't there
}
