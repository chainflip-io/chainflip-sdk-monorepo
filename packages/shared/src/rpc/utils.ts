import {
  AssetAndChain,
  UncheckedAssetAndChain,
  assertIsValidAssetAndChain,
} from '../enums';
import { ChainAssetMap, Environment } from './index';

const readAssetValue = <T>(
  minimums: ChainAssetMap<T>,
  asset: AssetAndChain,
): T => {
  const chainMinimums = minimums[asset.chain];
  return chainMinimums[asset.asset as keyof typeof chainMinimums];
};

type Result = { success: true } | { success: false; reason: string };

export const validateSwapAmount = (
  swapEnv: Environment['swapping'],
  asset: UncheckedAssetAndChain,
  amount: bigint,
): Result => {
  assertIsValidAssetAndChain(asset);
  const minAmount = readAssetValue(swapEnv.minimumSwapAmounts, asset);

  if (amount < minAmount) {
    return {
      success: false,
      reason: `expected amount is below minimum swap amount (${minAmount})`,
    };
  }

  const maxAmount = readAssetValue(swapEnv.maximumSwapAmounts, asset);

  if (maxAmount != null && amount > maxAmount) {
    return {
      success: false,
      reason: `expected amount is above maximum swap amount (${maxAmount})`,
    };
  }

  return { success: true };
};
