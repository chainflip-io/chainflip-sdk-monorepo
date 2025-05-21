import { type ChainflipAsset, assetConstants } from '@chainflip/utils/chainflip';
import { PoolFee, SwapFee } from '@/shared/schemas.js';

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
  const { symbol: asset, chain } = assetConstants[internalAsset];

  return { type, chain, asset, amount: amount.toString() };
}

export const getPoolFees = (
  srcAsset: ChainflipAsset,
  destAsset: ChainflipAsset,
): [PoolFee] | [PoolFee, PoolFee] => {
  if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
    return [buildFee(srcAsset, 'LIQUIDITY', 0n)];
  }

  return [buildFee(srcAsset, 'LIQUIDITY', 0n), buildFee('Usdc', 'LIQUIDITY', 0n)];
};
