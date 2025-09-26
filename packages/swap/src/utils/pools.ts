import { ChainflipAsset, readAssetValue } from '@chainflip/utils/chainflip';
import { FULL_TICK_RANGE } from '@/shared/consts.js';
import { AsyncCacheMap } from '@/shared/dataStructures.js';
import { assert } from '@/shared/guards.js';
import { getLpAccounts } from './lp.js';
import { getPoolDepth } from './rpc.js';
import prisma, { Pool } from '../client.js';

const poolCache = new AsyncCacheMap({
  fetch: async (baseAsset: ChainflipAsset) =>
    prisma.pool.findUniqueOrThrow({
      where: { baseAsset_quoteAsset: { baseAsset, quoteAsset: 'Usdc' } },
    }),
  ttl: 60_000,
});

export const getPools = async (
  srcAsset: ChainflipAsset,
  destAsset: ChainflipAsset,
): Promise<Pool[]> => {
  if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
    return [await poolCache.get(srcAsset === 'Usdc' ? destAsset : srcAsset)];
  }

  return Promise.all([poolCache.get(srcAsset), poolCache.get(destAsset)]);
};

const undeployedLiquidityCache = new AsyncCacheMap({
  fetch: async (asset: ChainflipAsset) => {
    const lpAccounts = await getLpAccounts();
    return lpAccounts.reduce((sum, account) => sum + readAssetValue(account.balances, asset), 0n);
  },
  resetExpiryOnLookup: false,
  ttl: 60_000,
});

const deployedLiquidityCache = new AsyncCacheMap({
  fetch: (asset: ChainflipAsset) => getPoolDepth(asset, 'Usdc', FULL_TICK_RANGE),
  resetExpiryOnLookup: false,
  ttl: 60_000,
});

export const getUndeployedLiquidity = async (asset: ChainflipAsset) =>
  undeployedLiquidityCache.get(asset);

export const getDeployedLiquidity = async (fromAsset: ChainflipAsset, toAsset: ChainflipAsset) => {
  assert(
    (fromAsset === 'Usdc' && toAsset !== 'Usdc') || (fromAsset !== 'Usdc' && toAsset === 'Usdc'),
    'One and only one asset must be USDC',
  );
  return fromAsset === 'Usdc'
    ? (await deployedLiquidityCache.get(toAsset)).baseLiquidityAmount
    : (await deployedLiquidityCache.get(fromAsset)).quoteLiquidityAmount;
};

export const getTotalLiquidity = async (fromAsset: ChainflipAsset, toAsset: ChainflipAsset) => {
  const undeployedLiquidity = await getUndeployedLiquidity(toAsset);
  return (await getDeployedLiquidity(fromAsset, toAsset)) + undeployedLiquidity;
};
