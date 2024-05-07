import { ONE_IN_PIP, bigintMin, getPipAmountFromAmount } from '@/shared/functions';
import { getBoostPoolsDepth } from './rpc';
import { InternalAsset } from '../client';

export const getBoostFeeBpsForAmount = async ({
  amount,
  asset,
}: {
  amount: bigint;
  asset: InternalAsset;
}): Promise<number | undefined> => {
  const assetBoostPoolsDepth = await getBoostPoolsDepth({ asset });
  assetBoostPoolsDepth.sort((a, b) => (a.tier < b.tier ? -1 : 1));

  let _amount = amount;
  let feeAmount = 0n;

  for (const poolDepth of assetBoostPoolsDepth) {
    const poolAvailableAmount = poolDepth.available_amount;

    const amountToBeUsedFromPool = bigintMin(_amount, poolAvailableAmount);
    feeAmount += getPipAmountFromAmount(amountToBeUsedFromPool, poolDepth.tier);
    _amount -= amountToBeUsedFromPool;
  }

  // Not enough liquidity in the boost pools
  if (_amount > 0) return undefined;

  return Number((feeAmount * BigInt(ONE_IN_PIP)) / BigInt(amount));
};
