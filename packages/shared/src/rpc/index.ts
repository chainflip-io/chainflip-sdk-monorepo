import { HttpClient, RpcMethod, RpcParams, RpcResult, constants } from '@chainflip/rpc';
import axios from 'axios';
import z from 'zod';
import { BaseAssetAndChain, ChainflipNetwork } from '../enums';
import { u128 } from '../parsers';

type CamelCase<T> = T extends string
  ? T extends `${infer F}_${infer R}`
    ? `${F}${Capitalize<CamelCase<R>>}`
    : T
  : never;

type CamelCaseObject<T> = { [K in keyof T as CamelCase<K>]: CamelCaseObject<T[K]> };

type ArrayOfCamelCaseObjects<T extends unknown[]> = CamelCaseObject<T[number]>[];

type CamelCaseValue<T> =
  T extends Record<string, unknown>
    ? CamelCaseObject<T>
    : T extends unknown[]
      ? ArrayOfCamelCaseObjects<T>
      : T;

const camelCase = <T extends string>(str: T): CamelCase<T> =>
  str.replace(/_([a-z])/g, (_, char) => char.toUpperCase()) as CamelCase<T>;

const camelCaseKeys = <T>(obj: T): CamelCaseValue<T> => {
  if (typeof obj !== 'object' || obj === null) return obj as CamelCaseValue<T>;

  if (Array.isArray(obj)) return obj.map((item) => camelCaseKeys(item)) as CamelCaseValue<T>;

  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [camelCase(key), camelCaseKeys(value)]),
  ) as CamelCaseValue<T>;
};

export type RpcConfig = { rpcUrl: string } | { network: ChainflipNetwork };

const createRequest =
  <M extends RpcMethod>(method: M) =>
  async (
    urlOrNetwork: RpcConfig,
    ...params: RpcParams[M]
  ): Promise<CamelCaseValue<RpcResult<M>>> => {
    const url =
      'network' in urlOrNetwork
        ? constants.PUBLIC_RPC_ENDPOINTS[urlOrNetwork.network]
        : urlOrNetwork.rpcUrl;
    const result = await new HttpClient(url).sendRequest(method, ...params);
    return camelCaseKeys(result);
  };

export const getFundingEnvironment = createRequest('cf_funding_environment');

export const getSwappingEnvironment = createRequest('cf_swapping_environment');

export const getIngressEgressEnvironment = createRequest('cf_ingress_egress_environment');

export const getEnvironment = createRequest('cf_environment');

export type Environment = Awaited<ReturnType<typeof getEnvironment>>;

export const getSwapRate = createRequest('cf_swap_rate');

export const getMetadata = createRequest('state_getMetadata');

export const getSupportedAssets = createRequest('cf_supported_assets');

export const getRuntimeVersion = createRequest('state_getRuntimeVersion');

export const getBlockHash = createRequest('chain_getBlockHash');

export const getAllBoostPoolsDepth = createRequest('cf_boost_pools_depth');

export type BoostPoolsDepth = Awaited<ReturnType<typeof getAllBoostPoolsDepth>>;

export const getPoolOrders = async (
  rpcConfig: RpcConfig,
  baseAsset: BaseAssetAndChain,
  quoteAsset: { chain: 'Ethereum'; asset: 'USDC' },
  lp: null,
  hash: string,
) => {
  const url =
    'network' in rpcConfig ? constants.PUBLIC_RPC_ENDPOINTS[rpcConfig.network] : rpcConfig.rpcUrl;
  const { data } = await axios.post(
    url,
    {
      id: '1',
      jsonrpc: '2.0',
      method: 'cf_pool_orders',
      params: [baseAsset, quoteAsset, lp, hash],
    },
    {
      transformResponse: (d) => d,
    },
  );

  return z.string().parse(data);
};

export const getPoolPriceV2 = async (
  rpcConfig: RpcConfig,
  baseAsset: BaseAssetAndChain,
  quoteAsset: { chain: 'Ethereum'; asset: 'USDC' },
  hash: string,
) => {
  const url =
    'network' in rpcConfig ? constants.PUBLIC_RPC_ENDPOINTS[rpcConfig.network] : rpcConfig.rpcUrl;
  const { data } = await axios.post(url, {
    id: '1',
    jsonrpc: '2.0',
    method: 'cf_pool_price_v2',
    params: [baseAsset, quoteAsset, hash],
  });

  return z
    .object({ range_order: u128 })
    .transform(({ range_order }) => ({ rangeOrder: range_order }))
    .parse(data);
};
