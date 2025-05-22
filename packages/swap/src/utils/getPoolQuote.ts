import { internalAssetToRpcAsset } from '@chainflip/utils/chainflip';
import { bigintMax, getPipAmountFromAmount } from '@/shared/functions.js';
import { isStableCoin } from '@/shared/guards.js';
import { DcaParams, Quote, SwapFeeType } from '@/shared/schemas.js';
import { calculateRecommendedSlippage } from './autoSlippage.js';
import { getPoolFees } from './fees.js';
import { getEgressFee, getMinimumEgressAmount } from './rpc.js';
import ServiceError from './ServiceError.js';
import { getSwapRateV3, QuoteLimitOrders, QuoteCcmParams } from './statechain.js';
import { InternalAsset, Pool } from '../client.js';
import { estimateSwapDuration, getSwapPrice } from './swap.js';
import env from '../config/env.js';
import { checkPriceWarning } from '../pricing/checkPriceWarning.js';

const isStableCoinSwap = (srcAsset: InternalAsset, destAsset: InternalAsset) =>
  isStableCoin(srcAsset) && isStableCoin(destAsset);

export default async function getPoolQuote({
  srcAsset,
  destAsset,
  depositAmount,
  limitOrders,
  boostFeeBps,
  brokerCommissionBps,
  ccmParams,
  pools,
  dcaParams,
  isVaultSwap,
  isOnChain,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  depositAmount: bigint;
  brokerCommissionBps?: number;
  ccmParams?: QuoteCcmParams;
  limitOrders?: QuoteLimitOrders;
  boostFeeBps?: number;
  pools: Pool[];
  dcaParams?: DcaParams;
  isVaultSwap: boolean | undefined;
  isOnChain: boolean | undefined;
}) {
  const includedFees = [];
  const excludeFees: SwapFeeType[] = [];
  let cfRateInputAmount = depositAmount;

  // After this ticket, boost fee should be included in the response so dont have to calculate it ourselves
  // https://linear.app/chainflip/issue/PRO-1370/include-boost-fees-in-quote-from-cf-swap-rate-v2
  if (boostFeeBps) {
    const boostFee = getPipAmountFromAmount(depositAmount, boostFeeBps);
    includedFees.push({
      type: 'BOOST',
      amount: boostFee,
      ...internalAssetToRpcAsset[srcAsset],
    } as const);
    cfRateInputAmount -= boostFee;
  }

  if (isVaultSwap) {
    excludeFees.push('IngressDepositChannel');
  }

  if (isOnChain) {
    excludeFees.push('Egress');
    excludeFees.push('IngressDepositChannel');
    excludeFees.push('IngressVaultSwap');
  }

  const { egressFee, ingressFee, networkFee, egressAmount, intermediateAmount, brokerFee } =
    await getSwapRateV3({
      srcAsset,
      destAsset,
      depositAmount: cfRateInputAmount,
      limitOrders,
      brokerCommissionBps,
      ccmParams,
      dcaParams,
      excludeFees,
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

  const minimumEgressAmount = isOnChain ? 0n : await getMinimumEgressAmount(destAsset);
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

  includedFees.push({ ...ingressFee, type: 'INGRESS' });

  if (isOnChain && networkFee.amount > env.MINIMUM_NETWORK_FEE_USDC) {
    const networkFeeBps = isStableCoinSwap(srcAsset, destAsset)
      ? env.ON_CHAIN_STABLECOIN_NETWORK_FEE_BPS
      : env.ON_CHAIN_DEFAULT_NETWORK_FEE_BPS;
    const normalNetworkFeeBps = 10n;
    networkFee.amount = bigintMax(
      (networkFee.amount * networkFeeBps) / normalNetworkFeeBps,
      env.MINIMUM_NETWORK_FEE_USDC,
    );
  }

  includedFees.push({ ...networkFee, type: 'NETWORK' });

  includedFees.push({ ...brokerFee, type: 'BROKER' });

  includedFees.push({ ...egressFee, type: 'EGRESS' });

  const poolInfo = getPoolFees(srcAsset, destAsset).map(({ type, ...fee }, i) => ({
    baseAsset: internalAssetToRpcAsset[pools[i].baseAsset],
    quoteAsset: internalAssetToRpcAsset[pools[i].quoteAsset],
    fee,
  }));

  const estimatedDurations = await estimateSwapDuration({
    srcAsset,
    destAsset,
    boosted: Boolean(boostFeeBps),
    isExternal: !isOnChain,
  });

  const dcaChunks = dcaParams?.numberOfChunks ?? 1;
  const quoteType = dcaChunks > 1 ? 'DCA' : 'REGULAR';

  const estimatedPrice = getSwapPrice(
    srcAsset,
    String(swapInputAmount),
    destAsset,
    String(swapOutputAmount),
  );

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
      estimatedPrice,
      isOnChain,
    }),
    includedFees: includedFees
      .filter((fee) => fee.amount > 0n)
      .map((fee) => ({ ...fee, amount: fee.amount.toString() })),
    lowLiquidityWarning,
    poolInfo,
    estimatedDurationsSeconds: estimatedDurations.durations,
    estimatedDurationSeconds: estimatedDurations.total,
    estimatedPrice: estimatedPrice.toFixed(),
    type: quoteType,
    srcAsset: internalAssetToRpcAsset[srcAsset],
    destAsset: internalAssetToRpcAsset[destAsset],
    depositAmount: depositAmount.toString(),
    isVaultSwap,
    isOnChain,
    ccmParams: ccmParams && {
      gasBudget: String(ccmParams.gasBudget),
      messageLengthBytes: ccmParams.messageLengthBytes,
    },
  } as Quote;
}
