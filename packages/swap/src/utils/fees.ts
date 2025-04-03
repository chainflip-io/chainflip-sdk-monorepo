import { type ChainflipAsset, assetConstants } from '@chainflip/utils/chainflip';
import assert from 'assert';
import { getPoolsNetworkFeeHundredthPips } from '@/shared/consts';
import { getHundredthPipAmountFromAmount, ONE_IN_HUNDREDTH_PIPS } from '@/shared/functions';
import { PoolFee, SwapFee } from '@/shared/schemas';
import { Pool } from '../client';
import { getPools } from './pools';
import env from '../config/env';

export function buildFee(
  internalAsset: ChainflipAsset,
  type: SwapFee['type'],
  amount: bigint,
): SwapFee;
export function buildFee(
  internalAsset: ChainflipAsset,
  type: PoolFee['type'],
  amount: bigint,
): PoolFee;
export function buildFee(
  internalAsset: ChainflipAsset,
  type: SwapFee['type'] | PoolFee['type'],
  amount: bigint,
): SwapFee | PoolFee;
export function buildFee(
  internalAsset: ChainflipAsset,
  type: SwapFee['type'] | PoolFee['type'],
  amount: bigint,
): SwapFee | PoolFee {
  const { rpcAsset: asset, chain } = assetConstants[internalAsset];

  return { type, chain, asset, amount: amount.toString() };
}

export const getPoolFees = (
  srcAsset: ChainflipAsset,
  destAsset: ChainflipAsset,
  swapInputAmount: bigint,
  intermediateAmount: bigint | null | undefined,
  pools: Pool[],
): [PoolFee] | [PoolFee, PoolFee] => {
  if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
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
  srcAsset: ChainflipAsset,
  destAsset: ChainflipAsset,
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

  if (srcAsset === 'Usdc') {
    return [buildNetworkFee(swapInputAmount, networkFeeHundredthPips), ...lpFees];
  }

  let usdcAmount;

  if (destAsset === 'Usdc') {
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
