import { Chain, readChainAssetValue, InternalAsset, getAssetAndChain } from '@/shared/enums';
import { getEnvironment, getPoolOrders } from '@/shared/rpc';
import { validateSwapAmount as validateAmount } from '@/shared/rpc/utils';
import { AsyncCacheMap } from './dataStructures';
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

const ordersCacheMap = new AsyncCacheMap({
  refresh: false,
  refreshInterval: 6_000,
  fetch: (baseAsset: Exclude<InternalAsset, 'Usdc'>) =>
    getPoolOrders(rpcConfig, getAssetAndChain(baseAsset), getAssetAndChain('Usdc')),
});

export const getCachedPoolOrdersAndPrice = ordersCacheMap.get.bind(ordersCacheMap);
