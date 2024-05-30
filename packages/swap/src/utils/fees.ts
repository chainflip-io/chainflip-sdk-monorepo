import assert from 'assert';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { InternalAsset, InternalAssets, assetConstants } from '@/shared/enums';
import { getHundredthPipAmountFromAmount, ONE_IN_HUNDREDTH_PIPS } from '@/shared/functions';
import { PoolFee, SwapFee } from '@/shared/schemas';
import { getPools } from '@/swap/utils/pools';
import { Pool } from '../client';
import env from '../config/env';

export function buildFee(
  internalAsset: InternalAsset,
  type: SwapFee['type'],
  amount: bigint,
): SwapFee;
export function buildFee(
  internalAsset: InternalAsset,
  type: PoolFee['type'],
  amount: bigint,
): PoolFee;
export function buildFee(
  internalAsset: InternalAsset,
  type: SwapFee['type'] | PoolFee['type'],
  amount: bigint,
): SwapFee | PoolFee;
export function buildFee(
  internalAsset: InternalAsset,
  type: SwapFee['type'] | PoolFee['type'],
  amount: bigint,
): SwapFee | PoolFee {
  const { asset, chain } = assetConstants[internalAsset];

  return { type, chain, asset, amount: amount.toString() };
}

export const getPoolFees = (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  swapInputAmount: bigint,
  intermediateAmount: bigint | null | undefined,
  pools: Pool[],
): [PoolFee] | [PoolFee, PoolFee] => {
  if (srcAsset === InternalAssets.Usdc || destAsset === InternalAssets.Usdc) {
    return [
      buildFee(
        srcAsset,
        'LIQUIDITY',
        getHundredthPipAmountFromAmount(swapInputAmount, pools[0].liquidityFeeHundredthPips),
      ),
    ];
  }

  assert(intermediateAmount != null, 'no intermediate amount given');

  return [
    buildFee(
      srcAsset,
      'LIQUIDITY',
      getHundredthPipAmountFromAmount(swapInputAmount, pools[0].liquidityFeeHundredthPips),
    ),
    buildFee(
      'Usdc',
      'LIQUIDITY',
      getHundredthPipAmountFromAmount(intermediateAmount, pools[1].liquidityFeeHundredthPips),
    ),
  ];
};

const buildNetworkFee = (usdcAmount: bigint, networkFeeHundredthPips: number) =>
  buildFee('Usdc', 'NETWORK', getHundredthPipAmountFromAmount(usdcAmount, networkFeeHundredthPips));

export const calculateIncludedSwapFees = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
  swapInputAmount: bigint,
  intermediateAmount: bigint | null | undefined,
  swapOutputAmount: bigint,
): Promise<(SwapFee | PoolFee)[]> => {
  const networkFeeHundredthPips = getPoolsNetworkFeeHundredthPips(env.CHAINFLIP_NETWORK);
  if (srcAsset === 'Usdc' && destAsset === 'Usdc') {
    return [buildNetworkFee(swapInputAmount, networkFeeHundredthPips)];
  }

  const pools = await getPools(srcAsset, destAsset);
  const lpFees = getPoolFees(srcAsset, destAsset, swapInputAmount, intermediateAmount, pools);

  if (srcAsset === InternalAssets.Usdc) {
    return [buildNetworkFee(swapInputAmount, networkFeeHundredthPips), ...lpFees];
  }

  let usdcAmount;

  if (destAsset === InternalAssets.Usdc) {
    usdcAmount =
      (swapOutputAmount * BigInt(ONE_IN_HUNDREDTH_PIPS)) /
      BigInt(ONE_IN_HUNDREDTH_PIPS - networkFeeHundredthPips);
  } else {
    assert(intermediateAmount != null, 'no intermediate amount given');

    usdcAmount =
      (intermediateAmount * BigInt(ONE_IN_HUNDREDTH_PIPS)) /
      BigInt(ONE_IN_HUNDREDTH_PIPS - networkFeeHundredthPips);
  }

  return [buildNetworkFee(usdcAmount, networkFeeHundredthPips), ...lpFees];
};
