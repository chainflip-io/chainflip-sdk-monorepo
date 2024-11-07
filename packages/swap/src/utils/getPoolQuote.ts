import BigNumber from 'bignumber.js';
import { assetConstants, chainConstants, getAssetAndChain, getInternalAsset } from '@/shared/enums';
import { getPipAmountFromAmount } from '@/shared/functions';
import { Quote, QuoteType } from '@/shared/schemas';
import { estimateSwapDuration, getSwapPrice } from '@/swap/utils/swap';
import { buildFee, getPoolFees } from './fees';
import { getDeployedLiquidity, undeployedLiquidityCache } from './pools';
import { getEgressFee, getMinimumEgressAmount, getRequiredBlockConfirmations } from './rpc';
import ServiceError from './ServiceError';
import { getSwapRateV2, LimitOrders } from './statechain';
import { InternalAsset, Pool } from '../client';
import { checkPriceWarning } from '../pricing/checkPriceWarning';

const getLiquidityAutoSlippage = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  depositAmount: bigint,
) => {
  const totalLiquidity = await getDeployedLiquidity(srcAsset, destAsset);
  const liquidityRatio = new BigNumber(depositAmount.toString()).div(totalLiquidity.toString());
  if (liquidityRatio.isGreaterThan(0.2)) {
    return liquidityRatio.multipliedBy(2);
  }
  return new BigNumber(0);
};

const getDepositTimeAutoSlippage = async (srcAsset: InternalAsset, isBoosted: boolean) => {
  const { chain } = assetConstants[srcAsset];
  const { blockTimeSeconds } = chainConstants[chain];
  const blockConfirmations = isBoosted ? 1 : (await getRequiredBlockConfirmations(srcAsset)) ?? 0;
  const depositTimeMinutes = (blockConfirmations * blockTimeSeconds) / 60;

  if (['Solana', 'Arbitrum'].includes(chain)) {
    return depositTimeMinutes * 0.01;
  } else if (['Ethereum', 'Polkadot'].includes(chain)) {
    return depositTimeMinutes * 0.05;
  }
  return depositTimeMinutes * 0.1;
};

const getUndeployedLiquidityAutoSlippage = async (
  srcAsset: InternalAsset,
  depositAmount: bigint,
) => {
  const undeployedLiquidity = await undeployedLiquidityCache.get(srcAsset);
  if (undeployedLiquidity >= depositAmount) {
    return new BigNumber(-0.5);
  }

  const undeployedRatio = new BigNumber(undeployedLiquidity.toString()).div(
    depositAmount.toString(),
  );
  if (undeployedRatio.gt(0.5)) {
    return new BigNumber(-undeployedRatio * 0.1);
  }

  return new BigNumber(0);
};

const calculateRecommendedSlippage = async ({
  srcAsset,
  destAsset,
  depositAmount,
  boostFeeBps,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  depositAmount: bigint;
  boostFeeBps?: number;
}) => {
  const minSlippage = 0.1;
  const baseSlippage = 1;

  const calculatedSlippage = (await getLiquidityAutoSlippage(srcAsset, destAsset, depositAmount))
    .plus(await getDepositTimeAutoSlippage(srcAsset, Boolean(boostFeeBps && boostFeeBps > 0)))
    .plus(await getUndeployedLiquidityAutoSlippage(srcAsset, depositAmount))
    .plus(baseSlippage);
  return Math.max(minSlippage, calculatedSlippage.toNumber());
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

  const estimatedDurations = await estimateSwapDuration({
    srcAsset,
    destAsset,
    boosted: Boolean(boostFeeBps),
  });

  return {
    intermediateAmount: intermediateAmount?.toString(),
    egressAmount: egressAmount.toString(),
    recommendedSlippageTolerancePercent: await calculateRecommendedSlippage({
      srcAsset,
      destAsset,
      depositAmount,
      boostFeeBps,
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
  } as Extract<Quote, { type: T }>;
}
