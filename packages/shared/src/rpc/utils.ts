import { UncheckedAssetAndChain, assertIsValidAssetAndChain } from '../enums';
import { bigintMax } from '../functions';
import { ChainAssetMap, Environment } from './index';

export const readAssetValue = <T>(
  value: ChainAssetMap<T>,
  asset: UncheckedAssetAndChain,
): T => {
  assertIsValidAssetAndChain(asset);
  const chainMinimums = value[asset.chain];
  return chainMinimums[asset.asset as keyof typeof chainMinimums];
};

export const readMinimumSwapAmount = (
  env: Pick<Environment, 'swapping' | 'ingressEgress'>,
  asset: UncheckedAssetAndChain,
): bigint => {
  const minimumSwapAmount = readAssetValue(
    env.swapping.minimumSwapAmounts,
    asset,
  );
  const minimumDepositAmount = readAssetValue(
    env.ingressEgress.minimumDepositAmounts,
    asset,
  );
  return bigintMax(minimumSwapAmount, minimumDepositAmount);
};

type Result = { success: true } | { success: false; reason: string };

export const validateSwapAmount = (
  env: Environment,
  asset: UncheckedAssetAndChain,
  amount: bigint,
): Result => {
  const minimumAmount = readMinimumSwapAmount(env, asset);

  if (amount < minimumAmount) {
    return {
      success: false,
      reason: `expected amount is below minimum swap amount (${minimumAmount})`,
    };
  }

  const maxAmount = readAssetValue(env.swapping.maximumSwapAmounts, asset);

  if (maxAmount != null && amount > maxAmount) {
    return {
      success: false,
      reason: `expected amount is above maximum swap amount (${maxAmount})`,
    };
  }

  return { success: true };
};
