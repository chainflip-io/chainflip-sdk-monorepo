import { getAssetAndChain, getInternalAsset } from '@/shared/enums';
import { getPipAmountFromAmount } from '@/shared/functions';
import { DcaParams, Quote, SwapFeeType } from '@/shared/schemas';
import { estimateSwapDuration, getSwapPrice } from '@/swap/utils/swap';
import { calculateRecommendedSlippage } from './autoSlippage';
import { buildFee, getPoolFees } from './fees';
import { getEgressFee, getMinimumEgressAmount } from './rpc';
import ServiceError from './ServiceError';
import { getSwapRateV3, LimitOrders } from './statechain';
import { InternalAsset, Pool } from '../client';
import { checkPriceWarning } from '../pricing/checkPriceWarning';

export default async function getPoolQuote({
  srcAsset,
  destAsset,
  depositAmount,
  limitOrders,
  boostFeeBps,
  brokerCommissionBps,
  pools,
  dcaParams,
  isVaultSwap
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  depositAmount: bigint;
  brokerCommissionBps?: number;
  limitOrders?: LimitOrders;
  boostFeeBps?: number;
  pools: Pool[];
  dcaParams?: DcaParams;
  isVaultSwap?: boolean; 
}) {
  const includedFees = [];
  const excludeFees: SwapFeeType[] = []; 
  let cfRateInputAmount = depositAmount;

  // After this ticket, boost fee should be included in the response so dont have to calculate it ourselves
  // https://linear.app/chainflip/issue/PRO-1370/include-boost-fees-in-quote-from-cf-swap-rate-v2
  if (boostFeeBps) {
    const boostFee = getPipAmountFromAmount(depositAmount, boostFeeBps);
    includedFees.push(buildFee(srcAsset, 'BOOST', boostFee));
    cfRateInputAmount -= boostFee;
  }

  if(isVaultSwap){
    excludeFees.push('Ingress') 
  }

  const { egressFee, ingressFee, networkFee, egressAmount, intermediateAmount, brokerFee } =
    await getSwapRateV3({
      srcAsset,
      destAsset,
      depositAmount: cfRateInputAmount,
      limitOrders,
      brokerCommissionBps,
      dcaParams,
      excludeFees
    });

  const swapInputAmount = cfRateInputAmount - ingressFee.amount;
  const swapOutputAmount = egressAmount + egressFee.amount;

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

  const lowLiquidityWarning = await checkPriceWarning({
    srcAsset,
    destAsset,
    srcAmount: swapInputAmount,
    destAmount: swapOutputAmount,
  });

  includedFees.push(
    buildFee(getInternalAsset(ingressFee), 'INGRESS', ingressFee.amount),
    buildFee('Usdc', 'NETWORK', networkFee.amount),
  );
  if (brokerFee.amount > 0n) {
    includedFees.push(buildFee('Usdc', 'BROKER', brokerFee.amount));
  }
  includedFees.push(buildFee(getInternalAsset(egressFee), 'EGRESS', egressFee.amount));

  const poolInfo = getPoolFees(srcAsset, destAsset, swapInputAmount, intermediateAmount, pools).map(
    ({ type, ...fee }, i) => ({
      baseAsset: getAssetAndChain(pools[i].baseAsset),
      quoteAsset: getAssetAndChain(pools[i].quoteAsset),
      fee,
    }),
  );

  const estimatedDurations = await estimateSwapDuration({
    srcAsset,
    destAsset,
    boosted: Boolean(boostFeeBps),
  });

  const dcaChunks = dcaParams?.numberOfChunks ?? 1;
  const quoteType = dcaChunks > 1 ? 'DCA' : 'REGULAR';

  return {
    intermediateAmount: intermediateAmount?.toString(),
    egressAmount: egressAmount.toString(),
    recommendedSlippageTolerancePercent: await calculateRecommendedSlippage({
      srcAsset,
      destAsset,
      boostFeeBps,
      intermediateAmount,
      egressAmount,
      dcaChunks,
    }),
    includedFees,
    lowLiquidityWarning,
    poolInfo,
    estimatedDurationsSeconds: estimatedDurations.durations,
    estimatedDurationSeconds: estimatedDurations.total,
    estimatedPrice: getSwapPrice(
      srcAsset,
      String(swapInputAmount),
      destAsset,
      String(swapOutputAmount),
    ),
    type: quoteType,
    srcAsset: getAssetAndChain(srcAsset),
    destAsset: getAssetAndChain(destAsset),
    depositAmount: depositAmount.toString(),
  } as Quote;
}
