// eslint-disable-next-line import/no-extraneous-dependencies
import { HttpClient, constants } from '@chainflip/rpc';
import type { ChainflipNetwork } from '@chainflip/utils/chainflip';
import type { RpcConfig, LendingPool, LendingConfig, PoolSupplyBalance } from './types.js';

type ToCamelCase<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<ToCamelCase<Tail>>}`
  : S;

type CamelCaseKeys<T> = T extends (infer U)[]
  ? U extends object
    ? CamelCaseKeys<U>[]
    : T
  : T extends object
    ? { [K in keyof T as ToCamelCase<string & K>]: CamelCaseKeys<T[K]> }
    : T;

const toCamelCase = (str: string): string =>
  str.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transformKeysToCamelCase = <T>(obj: T): CamelCaseKeys<T> => {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToCamelCase) as unknown as CamelCaseKeys<T>;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toCamelCase(key),
        transformKeysToCamelCase(value as Record<string, unknown>),
      ]),
    ) as CamelCaseKeys<T>;
  }
  return obj as CamelCaseKeys<T>;
};


export function getRpcUrl(config: RpcConfig): string {
  return 'rpcUrl' in config
    ? config.rpcUrl
    : constants.PUBLIC_RPC_ENDPOINTS[config.network as ChainflipNetwork];
}

const createRequest =
  <TResult>(method: string) =>
  async (config: RpcConfig, ...params: unknown[]): Promise<TResult> => {
    const url = getRpcUrl(config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await new HttpClient(url).sendRequest(method as any, ...(params as any));
    return transformKeysToCamelCase(result) as TResult;
  };

/**
 * Returns pool metrics for all lending pools.
 * RPC: cf_lending_pools
 */
export const getLendingPools = createRequest<LendingPool[]>('cf_lending_pools');

/**
 * Returns global lending protocol configuration — LTV thresholds, fee splits,
 * interest intervals, and slippage limits.
 * RPC: cf_lending_config
 */
export const getLendingConfig = createRequest<LendingConfig>('cf_lending_config');

/**
 * Returns per-pool supply positions. Pass an LP account address to scope to a
 * single provider, or omit to receive all positions across all providers.
 * RPC: cf_lending_pool_supply_balances
 */
export const getLendingPoolSupplyBalances = async (
  config: RpcConfig,
  lpAccount?: string,
): Promise<PoolSupplyBalance[]> => {
  const url = getRpcUrl(config);
  const params = lpAccount ? [lpAccount] : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await new HttpClient(url).sendRequest('cf_lending_pool_supply_balances' as any, ...params as any);
  return transformKeysToCamelCase(result) as PoolSupplyBalance[];
};
