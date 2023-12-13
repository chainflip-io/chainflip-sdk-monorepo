import { UncheckedAssetAndChain } from '@/shared/enums';
import {
  getIngressEgressEnvironment,
  getSwappingEnvironment,
} from '@/shared/rpc';
import {
  readAssetValue,
  validateSwapAmount as validateAmount,
} from '@/shared/rpc/utils';
import { memoize } from './function';

const cachedGetSwappingEnvironment = memoize(getSwappingEnvironment, 60_000);
const cachedGetIngressEgressEnvironment = memoize(
  getIngressEgressEnvironment,
  6_000,
);

type Result = { success: true } | { success: false; reason: string };

export const validateSwapAmount = async (
  asset: UncheckedAssetAndChain,
  amount: bigint,
): Promise<Result> => {
  const swapEnv = await cachedGetSwappingEnvironment({
    rpcUrl: process.env.RPC_NODE_HTTP_URL as string,
  });

  return validateAmount(swapEnv, asset, amount);
};

export const getIngressFee = async (
  asset: UncheckedAssetAndChain,
): Promise<bigint> => {
  const ingressEgressEnv = await cachedGetIngressEgressEnvironment({
    rpcUrl: process.env.RPC_NODE_HTTP_URL as string,
  });

  return ingressEgressEnv.ingressFees
    ? readAssetValue(ingressEgressEnv.ingressFees, asset)
    : 0n;
};

export const getEgressFee = async (
  asset: UncheckedAssetAndChain,
): Promise<bigint> => {
  const ingressEgressEnv = await cachedGetIngressEgressEnvironment({
    rpcUrl: process.env.RPC_NODE_HTTP_URL as string,
  });

  return ingressEgressEnv.egressFees
    ? readAssetValue(ingressEgressEnv.egressFees, asset)
    : 0n;
};
