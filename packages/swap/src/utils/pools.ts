import { ChainflipAsset, readAssetValue } from '@chainflip/utils/chainflip';
import { FULL_TICK_RANGE } from '@/shared/consts.js';
import { AsyncCacheMap } from '@/shared/dataStructures.js';
import { assert } from '@/shared/guards.js';
import { getLpAccounts } from './lp.js';
import { getPoolDepth } from './rpc.js';
import prisma, { Pool } from '../client.js';

export const getPools = async (
  srcAsset: ChainflipAsset,
  destAsset: ChainflipAsset,
): Promise<Pool[]> => {
  if (srcAsset === 'Usdc' || destAsset === 'Usdc') {
    return [
      await prisma.pool.findUniqueOrThrow({
        where: {
          baseAsset_quoteAsset: {
            baseAsset: srcAsset === 'Usdc' ? destAsset : srcAsset,
            quoteAsset: srcAsset === 'Usdc' ? srcAsset : destAsset,
          },
        },
      }),
    ];
  }

  return Promise.all([
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_quoteAsset: {
          baseAsset: srcAsset,
          quoteAsset: 'Usdc',
        },
      },
    }),
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_quoteAsset: {
          baseAsset: destAsset,
          quoteAsset: 'Usdc',
        },
      },
    }),
  ]);
};

const undeployedLiquidityCache = new AsyncCacheMap({
  fetch: async (asset: ChainflipAsset) => {
    const lpAccounts = await getLpAccounts();
    return lpAccounts.reduce((sum, account) => {
      assert(account.role === 'liquidity_provider', 'Account should be liquidity provider');

      return sum + readAssetValue(account.balances, asset);
    }, 0n);
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
