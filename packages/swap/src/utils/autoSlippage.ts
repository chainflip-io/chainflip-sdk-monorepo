import { ChainflipAsset, assetConstants, chainConstants } from '@chainflip/utils/chainflip';
import BigNumber from 'bignumber.js';
import { isStableCoin } from '@/shared/guards.js';
import { getDeployedLiquidity, getUndeployedLiquidity } from './pools.js';
import { getRequiredBlockConfirmations } from './rpc.js';
import env from '../config/env.js';

const getDeployedLiquidityAdjustment = async (
  srcAsset: ChainflipAsset,
  destAsset: ChainflipAsset,
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

const getDepositTimeAdjustment = async (srcAsset: ChainflipAsset, isBoosted: boolean) => {
  const { chain } = assetConstants[srcAsset];
  const { blockTimeSeconds } = chainConstants[chain];
  const blockConfirmations = isBoosted ? 1 : ((await getRequiredBlockConfirmations(srcAsset)) ?? 0);
  const depositTimeMinutes = (blockConfirmations * blockTimeSeconds) / 60;

  return Math.min(depositTimeMinutes / 20, 1); // Cap at 1
};

const getUndeployedLiquidityAdjustment = async (asset: ChainflipAsset, amount: bigint) => {
  const undeployedLiquidity = await getUndeployedLiquidity(asset);

  // if swap can be filled with jit liquidity only, decrease recommended tolerance
  if (amount < undeployedLiquidity / 2n) {
    return -0.5;
  }

  return 0;
};

const getLiquidityAdjustment = async ({
  srcAsset,
  destAsset,
  amount,
  dcaChunks,
}: {
  srcAsset: ChainflipAsset;
  destAsset: ChainflipAsset;
  amount: bigint;
  dcaChunks: number;
}) => {
  const [deployedLiquidityAdjustment, undeployedLiquidityAdjustment] = await Promise.all([
    getDeployedLiquidityAdjustment(srcAsset, destAsset, amount * BigInt(dcaChunks)),
    getUndeployedLiquidityAdjustment(destAsset, amount * BigInt(dcaChunks)),
  ]);

  return deployedLiquidityAdjustment + undeployedLiquidityAdjustment;
};

export const calculateRecommendedSlippage = async ({
  srcAsset,
  destAsset,
  intermediateAmount,
  egressAmount,
  boostFeeBps,
  dcaChunks,
  estimatedPrice,
  isOnChain,
}: {
  srcAsset: ChainflipAsset;
  destAsset: ChainflipAsset;
  intermediateAmount?: bigint | null;
  egressAmount: bigint;
  boostFeeBps?: number;
  dcaChunks: number;
  estimatedPrice: BigNumber;
  isOnChain: boolean | undefined;
}): Promise<number> => {
  // do not accept significant price movements for stable assets independently of available liquidity
  if (isStableCoin(srcAsset) && isStableCoin(destAsset)) {
    return Math.max(
      0.5,
      new BigNumber(1)
        .minus(new BigNumber(env.STABLE_COIN_SLIPPAGE_MIN_PRICE).dividedBy(estimatedPrice))
        .times(100)
        .decimalPlaces(2)
        .toNumber(),
    );
  }

  const baseSlippage =
    env.QUOTING_BASE_SLIPPAGE[srcAsset] ?? env.QUOTING_BASE_SLIPPAGE[destAsset] ?? 1;

  // use different limits for flip swaps because chainflip is the primary market for the flip token
  // because of this, lps cannot easily source liquidity from other markets (cex, dex) when filling a flip swap
  const MIN_SLIPPAGE = srcAsset === 'Flip' || destAsset === 'Flip' ? 1 : 0.5;
  const MAX_SLIPPAGE = srcAsset === 'Flip' || destAsset === 'Flip' ? 5 : 2.5;

  let recommendedSlippage = baseSlippage;
  recommendedSlippage += isOnChain
    ? 0
    : await getDepositTimeAdjustment(srcAsset, Boolean(boostFeeBps));

  if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
    recommendedSlippage += await getLiquidityAdjustment({
      srcAsset,
      destAsset,
      amount: egressAmount,
      dcaChunks,
    });
  } else {
    const [leg1Adjustment, leg2Adjustment] = await Promise.all([
      getLiquidityAdjustment({
        srcAsset,
        destAsset: 'Usdc',
        amount: intermediateAmount!,
        dcaChunks,
      }),
      getLiquidityAdjustment({
        srcAsset: 'Usdc',
        destAsset,
        amount: egressAmount,
        dcaChunks,
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
