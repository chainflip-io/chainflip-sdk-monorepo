import { FULL_TICK_RANGE } from '@/shared/consts';
import { InternalAsset, InternalAssets, readChainAssetValue } from '@/shared/enums';
import { assert } from '@/shared/guards';
import prisma, { Pool } from '@/swap/client';
import { AsyncCacheMap } from './dataStructures';
import { getLpAccounts } from './lp';
import { getPoolDepth } from './rpc';

export const getPools = async (
  srcAsset: InternalAsset,
  destAsset: InternalAsset,
): Promise<Pool[]> => {
  if (srcAsset === InternalAssets.Usdc || destAsset === InternalAssets.Usdc) {
    return [
      await prisma.pool.findUniqueOrThrow({
        where: {
          baseAsset_quoteAsset: {
            baseAsset: srcAsset === InternalAssets.Usdc ? destAsset : srcAsset,
            quoteAsset: srcAsset === InternalAssets.Usdc ? srcAsset : destAsset,
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
          quoteAsset: InternalAssets.Usdc,
        },
      },
    }),
    prisma.pool.findUniqueOrThrow({
      where: {
        baseAsset_quoteAsset: {
          baseAsset: destAsset,
          quoteAsset: InternalAssets.Usdc,
        },
      },
    }),
  ]);
};

const undeployedLiquidityCache = new AsyncCacheMap({
  fetch: async (asset: InternalAsset) => {
    const lpAccounts = await getLpAccounts();
    return lpAccounts.reduce((sum, account) => {
      assert(account.role === 'liquidity_provider', 'Account should be liquidity provider');

      return sum + readChainAssetValue(account.balances, asset);
    }, 0n);
  },
  resetExpiryOnLookup: false,
  ttl: 60_000,
});

const deployedLiquidityCache = new AsyncCacheMap({
  fetch: (asset: InternalAsset) => getPoolDepth(asset, InternalAssets.Usdc, FULL_TICK_RANGE),
  resetExpiryOnLookup: false,
  ttl: 60_000,
});

export const getUndeployedLiquidity = async (asset: InternalAsset) =>
  undeployedLiquidityCache.get(asset);

export const getDeployedLiquidity = async (fromAsset: InternalAsset, toAsset: InternalAsset) => {
  assert(
    (fromAsset === 'Usdc' && toAsset !== 'Usdc') || (fromAsset !== 'Usdc' && toAsset === 'Usdc'),
    'One and only one asset must be USDC',
  );
  return fromAsset === InternalAssets.Usdc
    ? (await deployedLiquidityCache.get(toAsset)).baseLiquidityAmount
    : (await deployedLiquidityCache.get(fromAsset)).quoteLiquidityAmount;
};

export const getTotalLiquidity = async (fromAsset: InternalAsset, toAsset: InternalAsset) => {
  const undeployedLiquidity = await getUndeployedLiquidity(toAsset);
  return (await getDeployedLiquidity(fromAsset, toAsset)) + undeployedLiquidity;
};
