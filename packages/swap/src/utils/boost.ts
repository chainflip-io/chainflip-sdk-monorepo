import { ONE_IN_PIP, bigintMin, getPipAmountFromAmount } from '@/shared/functions';
import { AsyncCacheMap } from './dataStructures';
import { getBoostPoolsDepth } from './rpc';
import { InternalAsset } from '../enums';

export const boostPoolsCache = new AsyncCacheMap({
  fetch: (asset: InternalAsset) => getBoostPoolsDepth({ asset }),
  resetExpiryOnLookup: false,
  ttl: 6_000,
});

export const getBoostFeeBpsForAmount = async ({
  amount,
  asset,
}: {
  amount: bigint;
  asset: InternalAsset;
}): Promise<number | undefined> => {
  const assetBoostPoolsDepth = await boostPoolsCache.get(asset);

  let remainingAmount = amount;
  let feeAmount = 0n;

  for (const poolDepth of assetBoostPoolsDepth) {
    const poolAvailableAmount = poolDepth.availableAmount;

    const amountToBeUsedFromPool = bigintMin(remainingAmount, poolAvailableAmount);
    feeAmount += getPipAmountFromAmount(amountToBeUsedFromPool, poolDepth.tier);
    remainingAmount -= amountToBeUsedFromPool;

    if (remainingAmount === 0n) break;
  }

  // Not enough liquidity in the boost pools
  if (remainingAmount > 0) return undefined;

  return Number((feeAmount * BigInt(ONE_IN_PIP)) / BigInt(amount));
};
