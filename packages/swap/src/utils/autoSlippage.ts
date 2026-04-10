import {
  BaseChainflipAsset,
  ChainflipAsset,
  assetConstants,
  chainConstants,
} from '@chainflip/utils/chainflip';
import { isNullish } from '@chainflip/utils/guard';
import BigNumber from 'bignumber.js';
import { isNotNullish, isStableCoin } from '@/shared/guards.js';
import { getDeployedLiquidity, getUndeployedLiquidity } from './pools.js';
import { getDefaultOracleProtectionValue, getRequiredBlockConfirmations } from './rpc.js';
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

  // Increase recommended tolerance proportionally if swap uses more than 50% of deployed liquidity
  return liquidityRatio > 0.5 ? liquidityRatio / 2 : 0;
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

  // Reduce recommended tolerance if swap can be covered with only JIT liquidity
  return amount < undeployedLiquidity / 2n ? -0.5 : 0;
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

const canUseTightSlippage = (srcAsset: ChainflipAsset, destAsset: ChainflipAsset) =>
  (isStableCoin(srcAsset) && isStableCoin(destAsset)) ||
  assetConstants[srcAsset].symbol === assetConstants[destAsset].symbol;

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
  if (canUseTightSlippage(srcAsset, destAsset)) {
    return Math.max(
      0.5,
      new BigNumber(1)
        .minus(new BigNumber(env.STABLE_COIN_SLIPPAGE_MIN_PRICE).dividedBy(estimatedPrice))
        .times(100)
        .decimalPlaces(2)
        .toNumber(),
    );
  }

  if (srcAsset === 'Flip' || destAsset === 'Flip') {
    return 10;
  }

  const baseSlippage =
    env.QUOTING_BASE_SLIPPAGE[srcAsset] ?? env.QUOTING_BASE_SLIPPAGE[destAsset] ?? 1;

  const MIN_SLIPPAGE = 0.5;
  const MAX_SLIPPAGE = 2.5;

  let recommendedSlippage = baseSlippage;

  const depositTimeAdjustmentPromise = isOnChain
    ? 0
    : getDepositTimeAdjustment(srcAsset, Boolean(boostFeeBps));

  const liquidityAdjustmentPromise =
    srcAsset === 'Usdc' || destAsset === 'Usdc'
      ? getLiquidityAdjustment({
          srcAsset,
          destAsset,
          amount: egressAmount,
          dcaChunks,
        })
      : Promise.all([
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
        ]).then(([leg1, leg2]) => Math.max(leg1, leg2));

  const [depositTimeAdjustment, liquidityAdjustment] = await Promise.all([
    depositTimeAdjustmentPromise,
    liquidityAdjustmentPromise,
  ]);

  recommendedSlippage += depositTimeAdjustment + liquidityAdjustment;

  // rounding to 0.25 steps
  recommendedSlippage = Math.round(recommendedSlippage * 4) / 4;

  // apply min and max
  recommendedSlippage = Math.min(Math.max(MIN_SLIPPAGE, recommendedSlippage), MAX_SLIPPAGE);

  return recommendedSlippage;
};

export const calculateRecommendedLivePriceSlippage = async ({
  srcAsset,
  destAsset,
}: {
  srcAsset: ChainflipAsset;
  destAsset: ChainflipAsset;
}) => {
  if (env.DISABLE_RECOMMENDED_LIVE_PRICE_SLIPPAGE) return undefined;

  const baseAssets = [srcAsset, destAsset].filter(
    (asset): asset is BaseChainflipAsset => asset !== 'Usdc',
  );

  const results = await Promise.all(
    baseAssets.map((asset) => getDefaultOracleProtectionValue(asset)),
  );

  // we don't recommend lpp if either of the base assets has no oracle protection value since
  // oracle protection is applied on the entire swap, not per leg. the protocol will then
  // apply defaults on the legs where possible
  if (results.some((result) => isNullish(result))) return undefined;

  const oracleProtectionValues = results.filter(isNotNullish);

  const baseAssetCount = baseAssets.length;

  let slippage: number;
  if (canUseTightSlippage(srcAsset, destAsset)) {
    slippage = env.DEFAULT_TIGHT_LPP_SLIPPAGE_BPS * baseAssetCount;
  } else if (env.DEFAULT_LPP_SLIPPAGE_BPS != null) {
    slippage = env.DEFAULT_LPP_SLIPPAGE_BPS * baseAssetCount;
  } else {
    slippage = oracleProtectionValues.reduce((acc, v) => acc + v, 0);
  }

  return Number((slippage / 100).toFixed(2));
};
