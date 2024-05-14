import { ONE_IN_PIP, bigintMin, getPipAmountFromAmount } from '@/shared/functions';
import { BoostPoolsDepth } from '@/shared/rpc';

export const getBoostFeeBpsForAmount = async ({
  amount,
  assetBoostPoolsDepth,
}: {
  amount: bigint;
  assetBoostPoolsDepth: BoostPoolsDepth;
}): Promise<number | undefined> => {
  assetBoostPoolsDepth.sort((a, b) => (a.tier < b.tier ? -1 : 1));

  let remainingAmount = amount;
  let feeAmount = 0n;

  for (const poolDepth of assetBoostPoolsDepth) {
    const poolAvailableAmount = poolDepth.availableAmount;

    const amountToBeUsedFromPool = bigintMin(remainingAmount, poolAvailableAmount);
    feeAmount += getPipAmountFromAmount(amountToBeUsedFromPool, poolDepth.tier);
    remainingAmount -= amountToBeUsedFromPool;
  }

  // Not enough liquidity in the boost pools
  if (remainingAmount > 0) return undefined;

  return Number((feeAmount * BigInt(ONE_IN_PIP)) / BigInt(amount));
};
