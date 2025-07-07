import { ChainflipAsset } from '@chainflip/utils/chainflip';
import { AsyncCacheMap } from '@/shared/dataStructures.js';
import { ONE_IN_PIP, bigintMin, getPipAmountFromAmount } from '@/shared/functions.js';
import { getBoostPoolsDepth } from './rpc.js';
import prisma, { Chain } from '../client.js';

export const boostPoolsCache = new AsyncCacheMap({
  fetch: (asset: ChainflipAsset) => getBoostPoolsDepth({ asset }),
  resetExpiryOnLookup: false,
  ttl: 6_000,
});

export const getBoostFeeBpsForAmount = async ({
  amount,
  asset,
}: {
  amount: bigint;
  asset: ChainflipAsset;
}): Promise<{ estimatedBoostFeeBps: number | undefined; maxBoostFeeBps: number }> => {
  const assetBoostPoolsDepth = await boostPoolsCache.get(asset);

  let remainingAmount = amount;
  let feeAmount = 0n;
  const maxBoostFeeBps = Math.max(...assetBoostPoolsDepth.map((pool) => pool.tier));

  for (const poolDepth of assetBoostPoolsDepth) {
    const poolAvailableAmount = poolDepth.availableAmount;

    const amountToBeUsedFromPool = bigintMin(remainingAmount, poolAvailableAmount);
    feeAmount += getPipAmountFromAmount(amountToBeUsedFromPool, poolDepth.tier);
    remainingAmount -= amountToBeUsedFromPool;

    if (remainingAmount === 0n) break;
  }

  // Not enough liquidity in the boost pools
  if (remainingAmount > 0) return { estimatedBoostFeeBps: undefined, maxBoostFeeBps };

  return {
    estimatedBoostFeeBps: Number((feeAmount * BigInt(ONE_IN_PIP)) / BigInt(amount)),
    maxBoostFeeBps,
  };
};

export const boostChainflipBlocksDelayCache = new AsyncCacheMap({
  fetch: (chain: Chain) =>
    prisma.boostDelayChainflipBlocks.findFirst({
      where: { chain },
    }),
  resetExpiryOnLookup: false,
  ttl: 6_000,
});

export const getBoostChainflipBlocksDelayForChain = async (chain: Chain): Promise<number> => {
  const boostDelay = await boostChainflipBlocksDelayCache.get(chain);
  return boostDelay?.numBlocks ?? 0;
};
