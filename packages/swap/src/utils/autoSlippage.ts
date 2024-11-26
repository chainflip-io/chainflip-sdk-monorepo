import BigNumber from 'bignumber.js';
import { assetConstants, chainConstants } from '@/shared/enums';
import env from '@/swap/config/env';
import { getDeployedLiquidity, getUndeployedLiquidity } from './pools';
import { getRequiredBlockConfirmations } from './rpc';
import { InternalAsset } from '../client';

const getDeployedLiquidityAdjustment = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  amount: bigint,
) => {
  const deployedLiquidity = await getDeployedLiquidity(srcAsset, destAsset);
  const liquidityRatio = new BigNumber(amount.toString())
    .div(deployedLiquidity.toString())
    .toNumber();

  // if swap will use more than 50% of deployed liquidity, increase recommended tolerance
  if (liquidityRatio > 0.5) {
    return liquidityRatio / 2;
  }

  return 0;
};

const getDepositTimeAdjustment = async (srcAsset: InternalAsset, isBoosted: boolean) => {
  const { chain } = assetConstants[srcAsset];
  const { blockTimeSeconds } = chainConstants[chain];
  const blockConfirmations = isBoosted ? 1 : (await getRequiredBlockConfirmations(srcAsset)) ?? 0;
  const depositTimeMinutes = (blockConfirmations * blockTimeSeconds) / 60;

  return Math.min(depositTimeMinutes / 20, 1); // Cap at 1
};

const getUndeployedLiquidityAdjustment = async (asset: InternalAsset, amount: bigint) => {
  const undeployedLiquidity = await getUndeployedLiquidity(asset);

  // if swap can be filled with jit liquidity only, decrease recommended tolerance
  if (amount < undeployedLiquidity / 2n) {
    return -0.5;
  }

  return 0;
};

const getPriceImpactAdjustment = async (asset: InternalAsset, dcaChunks: bigint) => {
  const priceImpactPercent = env.DCA_CHUNK_PRICE_IMPACT_PERCENT?.[asset] ?? 0;

  return priceImpactPercent * Number(dcaChunks);
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
  const [deployedLiquidityAdjustment, undeployedLiquidityAdjustment, priceImpactAdjustment] =
    await Promise.all([
      getDeployedLiquidityAdjustment(srcAsset, destAsset, amount * dcaChunks),
      getUndeployedLiquidityAdjustment(destAsset, amount * dcaChunks),
      getPriceImpactAdjustment(destAsset, dcaChunks),
    ]);

  return deployedLiquidityAdjustment + undeployedLiquidityAdjustment + priceImpactAdjustment;
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
  const BASE_SLIPPAGE = 1;

  // use different limits for flip swaps because chainflip is the primary market for the flip token
  // because of this, lps cannot easily source liquidity from other markets (cex, dex) when filling a flip swap
  const MIN_SLIPPAGE = srcAsset === 'Flip' || destAsset === 'Flip' ? 1.5 : 0.5;
  const MAX_SLIPPAGE = srcAsset === 'Flip' || destAsset === 'Flip' ? 7.5 : 2.5;

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
