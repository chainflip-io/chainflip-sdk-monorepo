import { ChainflipAsset, readAssetValue } from '@chainflip/utils/chainflip';
import { Environment } from './index';

type Result = { success: true } | { success: false; reason: string };

const MAX_SWAP_AMOUNT = 2n ** 128n - 1n;

export const validateSwapAmount = (
  env: Environment,
  asset: ChainflipAsset,
  amount: bigint,
): Result => {
  const minimumAmount = readAssetValue(env.ingressEgress.minimumDepositAmounts, asset);

  if (amount < minimumAmount) {
    return {
      success: false,
      reason: `expected amount is below minimum swap amount (${minimumAmount})`,
    };
  }

  const maxAmount = readAssetValue(env.swapping.maximumSwapAmounts, asset) ?? MAX_SWAP_AMOUNT;

  if (maxAmount != null && amount > maxAmount) {
    return {
      success: false,
      reason: `expected amount is above maximum swap amount (${maxAmount})`,
    };
  }

  return { success: true };
};
