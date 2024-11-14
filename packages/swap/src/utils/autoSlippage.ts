import BigNumber from 'bignumber.js';
import { assetConstants, chainConstants } from '@/shared/enums';
import { getDeployedLiquidity, getUndeployedLiquidity } from './pools';
import { getRequiredBlockConfirmations } from './rpc';
import { InternalAsset } from '../client';

const getDeployedLiquidityAdjustment = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  amount: bigint,
) => {
  const deployedLiquidity = await getDeployedLiquidity(srcAsset, destAsset);
  const liquidityRatio = new BigNumber(amount.toString()).div(deployedLiquidity.toString());

  if (liquidityRatio.isGreaterThan(0.2)) {
    return liquidityRatio.multipliedBy(2);
  }
  return new BigNumber(0);
};

const getDepositTimeAdjustment = async (srcAsset: InternalAsset, isBoosted: boolean) => {
  const { chain } = assetConstants[srcAsset];
  const { blockTimeSeconds } = chainConstants[chain];
  const blockConfirmations = isBoosted ? 1 : (await getRequiredBlockConfirmations(srcAsset)) ?? 0;
  const depositTimeMinutes = (blockConfirmations * blockTimeSeconds) / 60;

  return Math.min(depositTimeMinutes * 0.05, 1); // Cap at 1
};

const getUndeployedLiquidityAdjustment = async (asset: InternalAsset, amount: bigint) => {
  const undeployedLiquidity = await getUndeployedLiquidity(asset);
  if (undeployedLiquidity >= amount) {
    return new BigNumber(-0.5);
  }

  const undeployedRatio = new BigNumber(undeployedLiquidity.toString()).div(amount.toString());
  if (undeployedRatio.gt(0.5)) {
    return new BigNumber(-undeployedRatio * 0.1);
  }

  return new BigNumber(0);
};

const getLiquidityAdjustment = async ({
  srcAsset,
  destAsset,
  amount,
  dcaChunks,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: bigint;
  dcaChunks: bigint;
}) => {
  const [deployedLiquiditySlippage, undeployedLiquiditySlippage] = await Promise.all([
    getDeployedLiquidityAdjustment(srcAsset, destAsset, amount * dcaChunks),
    getUndeployedLiquidityAdjustment(destAsset, amount * dcaChunks),
  ]);

  return deployedLiquiditySlippage.plus(undeployedLiquiditySlippage).toNumber();
};

export const calculateRecommendedSlippage = async ({
  srcAsset,
  destAsset,
  intermediateAmount,
  egressAmount,
  boostFeeBps,
  dcaChunks,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  intermediateAmount?: bigint;
  egressAmount: bigint;
  boostFeeBps?: number;
  dcaChunks: number;
}) => {
  const MIN_SLIPPAGE = 0.1;
  const MAX_SLIPPAGE = 5;
  const BASE_SLIPPAGE = 1;

  let recommendedSlippage = BASE_SLIPPAGE;
  recommendedSlippage += await getDepositTimeAdjustment(srcAsset, Boolean(boostFeeBps));

  if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
    recommendedSlippage += await getLiquidityAdjustment({
      srcAsset,
      destAsset,
      amount: egressAmount,
      dcaChunks: BigInt(dcaChunks),
    });
  } else {
    const [leg1Adjustment, leg2Adjustment] = await Promise.all([
      getLiquidityAdjustment({
        srcAsset,
        destAsset: 'Usdc',
        amount: intermediateAmount!,
        dcaChunks: BigInt(dcaChunks),
      }),
      getLiquidityAdjustment({
        srcAsset: 'Usdc',
        destAsset,
        amount: egressAmount,
        dcaChunks: BigInt(dcaChunks),
      }),
    ]);

    recommendedSlippage += Math.max(leg1Adjustment, leg2Adjustment);
  }

  // rounding to 0.25 steps
  recommendedSlippage = Math.round(recommendedSlippage * 4) / 4;

  // apply min and max
  recommendedSlippage = Math.min(Math.max(MIN_SLIPPAGE, recommendedSlippage), MAX_SLIPPAGE);

  return recommendedSlippage;
};
