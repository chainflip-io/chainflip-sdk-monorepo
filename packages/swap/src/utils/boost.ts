import { ChainflipAsset } from '@chainflip/utils/chainflip';
import { calculateTotalEffectiveBorrowableAmount } from '@chainflip/utils/lending';
import { AsyncCacheMap } from '@/shared/dataStructures.js';
import { ONE_IN_PIP, bigintMin, getPipAmountFromAmount } from '@/shared/functions.js';
import { getBoostPoolsDepth, getRuntimeVersion, getSupplyPoolsDepth } from './rpc.js';

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
const SUPPLY_POOL_BOOST_FEE_BPS = 5;

export const getBoostFeeBpsForAmount = async ({
  amount,
  asset,
}: {
  amount: bigint;
  asset: ChainflipAsset;
}): Promise<{ estimatedBoostFeeBps: number | undefined; maxBoostFeeBps: number }> => {
  if (asset !== 'Btc') return { estimatedBoostFeeBps: undefined, maxBoostFeeBps: 0 };
  const { specVersion } = await getRuntimeVersion();
  const assetBoostPoolsDepth = await boostPoolsCache.get(asset);
  const assetSupplyPoolsDepth = specVersion >= 20200 ? await supplyPoolsCache.get(asset) : []; // TODO(2.2): Remove version check once all networks are upgraded

  let remainingAmount = amount;
  let feeAmount = 0n;

  const maxBoostFeeBps = Math.max(
    0,
    ...[
      assetBoostPoolsDepth.map((pool) => pool.tier),
      assetSupplyPoolsDepth.length > 0 ? SUPPLY_POOL_BOOST_FEE_BPS : 0, // Supply pools have a fixed 5 bps fee for boost loans
    ].flat(),
  );
  // TODO(2.2): Simplify logic by checking against total liquidity of both pools and calculating fee amount only once at the end
  for (const poolDepth of [assetBoostPoolsDepth, assetSupplyPoolsDepth].flat()) {
    let poolAvailableAmount = poolDepth.availableAmount;

    if ('utilisationCap' in poolDepth) {
      // TODO(2.2): Document and simplify this logic by calculating the effective available amount in the RPC itself
      poolAvailableAmount = calculateTotalEffectiveBorrowableAmount({
        totalAmount: poolDepth.totalAmount,
        totalAvailableAmount: poolDepth.availableAmount,
        utilisationCap: poolDepth.utilisationCap,
      });
    }

    const amountToBeUsedFromPool = bigintMin(remainingAmount, poolAvailableAmount);
    feeAmount += getPipAmountFromAmount(
      amountToBeUsedFromPool,
      'tier' in poolDepth ? poolDepth.tier : 5, // Supply pools have a fixed 5 bps fee for boost loans
    );
    remainingAmount -= amountToBeUsedFromPool;

    if (remainingAmount === 0n) break;
  }

  // Not enough liquidity to boost the entire amount
  if (remainingAmount > 0) return { estimatedBoostFeeBps: undefined, maxBoostFeeBps };

  return {
    estimatedBoostFeeBps: Number((feeAmount * BigInt(ONE_IN_PIP)) / BigInt(amount)),
    maxBoostFeeBps,
  };
};
