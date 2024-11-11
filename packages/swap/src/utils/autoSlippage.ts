import BigNumber from 'bignumber.js';
import { assetConstants, chainConstants } from '@/shared/enums';
import { getDeployedLiquidity, getUndeployedLiquidity } from './pools';
import { getRequiredBlockConfirmations } from './rpc';
import { InternalAsset } from '../client';

const getLiquidityAdjustment = async (
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

const calculateSingleLegSlippage = async ({
  srcAsset,
  destAsset,
  amount,
  isBoosted,
  dcaChunks,
  ignoreDepositTime,
}: {
  srcAsset: InternalAsset;
  destAsset: InternalAsset;
  amount: bigint;
  isBoosted: boolean;
  dcaChunks: bigint;
  ignoreDepositTime?: boolean;
}) => {
  const baseSlippage = 1;

  const [timeSlippage, deployedLiquiditySlippage, undeployedLiquiditySlippage] = await Promise.all([
    getDepositTimeAdjustment(srcAsset, isBoosted),
    getLiquidityAdjustment(srcAsset, destAsset, amount * dcaChunks),
    getUndeployedLiquidityAdjustment(destAsset, amount * dcaChunks),
  ]);

  return deployedLiquiditySlippage
    .plus(ignoreDepositTime ? 0 : timeSlippage)
    .plus(undeployedLiquiditySlippage)
    .plus(baseSlippage);
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
  const minSlippage = 0.1;

  if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
    // Single leg swap
    const calculatedSlippage = await calculateSingleLegSlippage({
      srcAsset,
      destAsset,
      amount: egressAmount,
      isBoosted: !!boostFeeBps,
      dcaChunks: BigInt(dcaChunks),
    });

    return Math.max(minSlippage, Math.round(calculatedSlippage.toNumber() * 4) / 4);
  }

  // Two leg swap
  const calculatedSlippageLeg1 = await calculateSingleLegSlippage({
    srcAsset,
    destAsset: 'Usdc',
    amount: intermediateAmount!,
    isBoosted: !!boostFeeBps,
    dcaChunks: BigInt(dcaChunks),
  });
  const calculatedSlippageLeg2 = await calculateSingleLegSlippage({
    srcAsset: 'Usdc',
    destAsset,
    amount: egressAmount,
    isBoosted: !!boostFeeBps,
    dcaChunks: BigInt(dcaChunks),
    ignoreDepositTime: true,
  });

  const avgSlippage = calculatedSlippageLeg1.plus(calculatedSlippageLeg2).div(2).toNumber();
  return Math.max(minSlippage, Math.round(avgSlippage * 4) / 4);
};
