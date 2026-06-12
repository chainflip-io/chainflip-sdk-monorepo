import { ChainflipAsset } from '@chainflip/utils/chainflip';
import { calculateTotalEffectiveBorrowableAmount, ppmToBps } from '@chainflip/utils/lending';
import BigNumber from 'bignumber.js';
import { SUPPLY_POOL_BOOST_FEE_BPS } from '@/shared/consts.js';
import { AsyncCacheMap } from '@/shared/dataStructures.js';
import { ONE_IN_PIP, bigintMin, getPipAmountFromAmount } from '@/shared/functions.js';
import { cachedGetRuntimeVersion, getBoostPoolsDepth, getSupplyPoolsDepth } from './rpc.js';

export const boostPoolsCache = new AsyncCacheMap({
  fetch: (asset: ChainflipAsset) => getBoostPoolsDepth({ asset }),
  resetExpiryOnLookup: false,
  ttl: 6_000,
});

export const supplyPoolsCache = new AsyncCacheMap({
  fetch: (asset: ChainflipAsset) => getSupplyPoolsDepth({ asset }),
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
  if (asset !== 'Btc' || amount === 0n)
    return { estimatedBoostFeeBps: undefined, maxBoostFeeBps: 0 };
  const { specVersion } = await cachedGetRuntimeVersion();
  const assetBoostPoolsDepth = await boostPoolsCache.get(asset);
  const assetSupplyPoolsDepth = specVersion >= 20200 ? await supplyPoolsCache.get(asset) : []; // TODO(2.2): Remove version check once all networks are upgraded

  let remainingAmount = amount;
  let feeAmount = 0n;

  const maxBoostFeeBps = Math.max(
    0,
    ...assetBoostPoolsDepth.map((pool) => pool.tier),
    assetSupplyPoolsDepth.length > 0 ? SUPPLY_POOL_BOOST_FEE_BPS : 0,
  );
  // TODO(2.2): Simplify logic by checking against total liquidity of both pools and calculating fee amount only once at the end
  for (const poolDepth of [assetBoostPoolsDepth, assetSupplyPoolsDepth].flat()) {
    let poolAvailableAmount = poolDepth.availableAmount;

    if ('utilisationCap' in poolDepth) {
      // TODO(2.2): Document and simplify this logic by calculating the effective available amount in the RPC itself
      poolAvailableAmount = calculateTotalEffectiveBorrowableAmount({
        totalAmount: poolDepth.totalAmount,
        totalAvailableAmount: poolDepth.availableAmount,
        utilisationCapBps: ppmToBps(poolDepth.utilisationCap ?? 1_000_000),
      });
    }

    const amountToBeUsedFromPool = bigintMin(remainingAmount, poolAvailableAmount);
    feeAmount += getPipAmountFromAmount(
      amountToBeUsedFromPool,
      'tier' in poolDepth ? poolDepth.tier : SUPPLY_POOL_BOOST_FEE_BPS, // Supply pools have a fixed fee for boost loans
    );
    remainingAmount -= amountToBeUsedFromPool;

    if (remainingAmount === 0n) break;
  }

  // Not enough liquidity to boost the entire amount
  if (remainingAmount > 0) return { estimatedBoostFeeBps: undefined, maxBoostFeeBps };

  return {
    estimatedBoostFeeBps: Math.max(
      5,
      Math.trunc(new BigNumber(feeAmount).multipliedBy(ONE_IN_PIP).dividedBy(amount).toNumber()),
    ),
    maxBoostFeeBps,
  };
};
