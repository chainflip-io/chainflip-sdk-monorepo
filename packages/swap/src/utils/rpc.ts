import { Chain, readChainAssetValue, InternalAsset, getAssetAndChain } from '@/shared/enums';
import { getEnvironment, getPoolOrders, getPoolPriceV2 } from '@/shared/rpc';
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

const fetchOrdersAndPrice = async (baseAsset: Exclude<InternalAsset, 'Usdc'>) => {
  const [orders, price] = await Promise.all([
    getPoolOrders(rpcConfig, getAssetAndChain(baseAsset), getAssetAndChain('Usdc')),
    getPoolPriceV2(rpcConfig, getAssetAndChain(baseAsset), getAssetAndChain('Usdc')),
  ]);

  return { poolState: orders, rangeOrderPrice: price.rangeOrder };
};

const ordersCacheMap = new AsyncCacheMap({
  resetExpiryOnLookup: false,
  ttl: 6_000,
  fetch: fetchOrdersAndPrice,
});

export const getCachedPoolOrdersAndPrice = (baseAsset: Exclude<InternalAsset, 'Usdc'>) =>
  ordersCacheMap.get(baseAsset);
