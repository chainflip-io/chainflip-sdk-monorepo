import { HttpClient, RpcMethod, RpcParams, RpcResult, constants } from '@chainflip/rpc';
import { ChainflipNetwork, getInternalAsset } from '@chainflip/utils/chainflip';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncFn = (...args: any[]) => Promise<any>;

const transform =
  <T, F extends AsyncFn>(
    fn: F,
    cb: (value: Awaited<ReturnType<F>>) => T,
  ): ((...args: Parameters<F>) => Promise<T>) =>
  (...args) =>
    fn(...args).then(cb);

export const getFundingEnvironment = createRequest('cf_funding_environment');

export const getSwappingEnvironment = createRequest('cf_swapping_environment');

export const getIngressEgressEnvironment = createRequest('cf_ingress_egress_environment');

export const getEnvironment = createRequest('cf_environment');

export type Environment = Awaited<ReturnType<typeof getEnvironment>>;

export const getSwapRate = createRequest('cf_swap_rate');

export const getMetadata = createRequest('state_getMetadata');

export const getRuntimeVersion = createRequest('state_getRuntimeVersion');

export const getBlockHash = createRequest('chain_getBlockHash');

export const getPoolDepth = createRequest('cf_pool_depth');

export const getAccounts = createRequest('cf_accounts');

export const getAccountInfo = createRequest('cf_account_info');

export const getAllBoostPoolsDepth = transform(createRequest('cf_boost_pools_depth'), (result) =>
  result.map(({ chain, asset, ...rest }) => ({
    asset: getInternalAsset({ chain, asset }),
    ...rest,
  })),
);

export type BoostPoolsDepth = Awaited<ReturnType<typeof getAllBoostPoolsDepth>>;

export const getSwapRateV3 = createRequest('cf_swap_rate_v3');
