import { ONE_IN_PIP, bigintMin, getPipAmountFromAmount } from '@/shared/functions';
import { BoostPoolsDepth } from '../rpc';

export const getBoostFeeBpsForAmount = async ({
  amount,
  assetBoostPoolsDepth,
}: {
  amount: bigint;
  assetBoostPoolsDepth: BoostPoolsDepth;
}): Promise<number | undefined> => {
  let _amount = amount;
  let feeAmount = 0n;

  for (const poolDepth of assetBoostPoolsDepth) {
    const poolAvailableAmount = poolDepth.availableAmount;

    const amountToBeUsedFromPool = bigintMin(_amount, poolAvailableAmount);
    feeAmount += getPipAmountFromAmount(amountToBeUsedFromPool, poolDepth.tier);
    _amount -= amountToBeUsedFromPool;
  }

  // Not enough liquidity in the boost pools
  if (_amount > 0) return undefined;

  return Number((feeAmount * BigInt(ONE_IN_PIP)) / BigInt(amount));
};
