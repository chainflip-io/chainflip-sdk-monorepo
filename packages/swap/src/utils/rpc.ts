import { Chain, readChainAssetValue, InternalAsset, getInternalAsset } from '@/shared/enums';
import { getAllBoostPoolsDepth, getEnvironment } from '@/shared/rpc';
import { validateSwapAmount as validateAmount } from '@/shared/rpc/utils';
import { memoize } from './function';
import env from '../config/env';

const cachedGetEnvironment = memoize(getEnvironment, 6_000);

type Result = { success: true } | { success: false; reason: string };

const rpcConfig = { rpcUrl: env.RPC_NODE_HTTP_URL };

export const validateSwapAmount = async (asset: InternalAsset, amount: bigint): Promise<Result> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return validateAmount(environment, asset, amount);
};

export const getMinimumEgressAmount = async (asset: InternalAsset): Promise<bigint> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return readChainAssetValue(environment.ingressEgress.minimumEgressAmounts, asset);
};

export const getWitnessSafetyMargin = async (chain: Chain): Promise<bigint | null> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return environment.ingressEgress.witnessSafetyMargins[chain];
};

export const getIngressFee = async (asset: InternalAsset): Promise<bigint | null> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return readChainAssetValue(environment.ingressEgress.ingressFees, asset);
};

export const getEgressFee = async (asset: InternalAsset): Promise<bigint | null> => {
  const environment = await cachedGetEnvironment(rpcConfig);

  return readChainAssetValue(environment.ingressEgress.egressFees, asset);
};

export const getBoostPoolsDepth = async ({
  asset,
}: {
  asset?: InternalAsset;
}): Promise<ReturnType<typeof getAllBoostPoolsDepth>> => {
  const allBoostPoolsDepth = await getAllBoostPoolsDepth(rpcConfig);

  if (asset) {
    return allBoostPoolsDepth.filter(
      (boostPoolDepth) => getInternalAsset(boostPoolDepth) === asset,
    );
  }

  return allBoostPoolsDepth;
};
