import { UncheckedAssetAndChain } from '@/shared/enums';
import { getEnvironment } from '@/shared/rpc';
import {
  readAssetValue,
  validateSwapAmount as validateAmount,
} from '@/shared/rpc/utils';
import { memoize } from './function';

const cachedGetEnvironment = memoize(getEnvironment, 6_000);

type Result = { success: true } | { success: false; reason: string };

export const validateSwapAmount = async (
  asset: UncheckedAssetAndChain,
  amount: bigint,
): Promise<Result> => {
  const env = await cachedGetEnvironment({
    rpcUrl: process.env.RPC_NODE_HTTP_URL as string,
  });

  return validateAmount(env, asset, amount);
};

export const getNativeIngressFee = async (
  asset: UncheckedAssetAndChain,
): Promise<bigint> => {
  const env = await cachedGetEnvironment({
    rpcUrl: process.env.RPC_NODE_HTTP_URL as string,
  });

  return readAssetValue(env.ingressEgress.ingressFees, asset);
};

export const getNativeEgressFee = async (
  asset: UncheckedAssetAndChain,
): Promise<bigint> => {
  const env = await cachedGetEnvironment({
    rpcUrl: process.env.RPC_NODE_HTTP_URL as string,
  });

  return readAssetValue(env.ingressEgress.egressFees, asset);
};
