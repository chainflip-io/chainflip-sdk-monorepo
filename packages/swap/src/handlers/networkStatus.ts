import { HttpClient } from '@chainflip/rpc';
import { RpcMethod, RpcRequest, RpcResult } from '@chainflip/rpc/common';
import { assetConstants, ChainflipAsset, getInternalAsset } from '@chainflip/utils/chainflip';
import { uncapitalize } from '@chainflip/utils/string';
import { MultiCache, Fetcher } from '@/shared/dataStructures.js';
import env from '../config/env.js';

const httpClient = new HttpClient(env.RPC_NODE_HTTP_URL);

// get the rpc methods that take no arguments
type SimpleRpcMethod = {
  [K in RpcMethod]: RpcRequest[K] extends [at?: string | null | undefined] ? K : never;
}[RpcMethod];

type RpcFetcherMap<T extends SimpleRpcMethod> = {
  [K in T]: {
    fetch: Fetcher<RpcResult<K>>;
    ttl: number;
  };
};

class RpcCache<T extends SimpleRpcMethod> extends MultiCache<RpcFetcherMap<T>> {
  constructor(methods: T[]) {
    super(
      Object.fromEntries(
        methods.map((method) => [
          method,
          {
            fetch: () => httpClient.sendRequest(method),
            ttl: 10_000,
          },
        ]),
      ) as RpcFetcherMap<T>,
    );
  }
}

const cache = new RpcCache(['cf_supported_assets', 'cf_safe_mode_statuses']);

const networkStatus = async (): Promise<{
  assets: {
    deposit: ChainflipAsset[];
    destination: ChainflipAsset[];
    all: ChainflipAsset[];
  };
  boostDepositsEnabled: boolean;
  cfBrokerCommissionBps: number;
}> => {
  const [assets, safeModeStatuses] = await Promise.all([
    cache.read('cf_supported_assets'),
    cache.read('cf_safe_mode_statuses'),
  ]);

  const enabledAssets = (safeModeStatuses.swapping.swaps_enabled ? assets : [])
    .map((a) => getInternalAsset(a))
    .filter((a) => !env.FULLY_DISABLED_INTERNAL_ASSETS.has(a));

  const depositAssets = enabledAssets
    .filter(
      (a) =>
        safeModeStatuses[`ingress_egress_${uncapitalize(assetConstants[a].chain)}`]
          .deposits_enabled,
    )
    .filter((a) => !env.DISABLED_DEPOSIT_INTERNAL_ASSETS.has(a));

  const destinationAssets = (
    safeModeStatuses.swapping.withdrawals_enabled ? enabledAssets : []
  ).filter((a) => !env.DISABLED_DESTINATION_INTERNAL_ASSETS.has(a));

  return {
    assets: {
      deposit: depositAssets,
      destination: destinationAssets,
      all: enabledAssets,
    },
    boostDepositsEnabled: safeModeStatuses.ingress_egress_bitcoin.boost_deposits_enabled,
    cfBrokerCommissionBps: env.BROKER_COMMISSION_BPS,
  };
};

export default networkStatus;
