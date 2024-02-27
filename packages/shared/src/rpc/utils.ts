import { readChainAssetValue, UncheckedAssetAndChain } from '../enums';
import { Environment } from './index';

type Result = { success: true } | { success: false; reason: string };

export const validateSwapAmount = (
  env: Environment,
  asset: UncheckedAssetAndChain,
  amount: bigint,
): Result => {
  const minimumAmount = readChainAssetValue(
    env.ingressEgress.minimumDepositAmounts,
    asset,
  );

  if (amount < minimumAmount) {
    return {
      success: false,
      reason: `expected amount is below minimum swap amount (${minimumAmount})`,
    };
  }

  const maxAmount = readChainAssetValue(env.swapping.maximumSwapAmounts, asset);

  if (maxAmount != null && amount > maxAmount) {
    return {
      success: false,
      reason: `expected amount is above maximum swap amount (${maxAmount})`,
    };
  }

  return { success: true };
};
