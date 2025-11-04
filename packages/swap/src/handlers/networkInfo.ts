import { HttpClient } from '@chainflip/rpc';
import { RpcMethod, RpcRequest, RpcResult } from '@chainflip/rpc/common';
import { assetConstants, getInternalAsset } from '@chainflip/utils/chainflip';
import { uncapitalize } from '@chainflip/utils/string';
import z from 'zod';
import type { NetworkInfo } from '@/shared/api/networkInfo.js';
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

const cache = new RpcCache(['cf_available_pools', 'cf_safe_mode_statuses']);

const networkInfo = async (): Promise<z.output<typeof NetworkInfo>> => {
  const [assets, safeModeStatuses] = await Promise.all([
    cache
      .read('cf_available_pools')
      .then((pools) => ['Usdc' as const, ...pools.map((p) => getInternalAsset(p.base))]),
    cache.read('cf_safe_mode_statuses'),
  ]);

  const assetInfo = assets.map((asset) => {
    const isEnabled =
      safeModeStatuses.swapping.swaps_enabled && !env.FULLY_DISABLED_INTERNAL_ASSETS.has(asset);
    const ingressEgress =
      safeModeStatuses[`ingress_egress_${uncapitalize(assetConstants[asset].chain)}`];
    const broadcast = safeModeStatuses[`broadcast_${uncapitalize(assetConstants[asset].chain)}`];
    const canDeposit = isEnabled && !env.DISABLED_DEPOSIT_INTERNAL_ASSETS.has(asset);
    const vaultSwapDepositsEnabled = ingressEgress.vault_deposit_witnessing_enabled;
    const depositChannelDepositsEnabled = ingressEgress.deposit_channel_witnessing_enabled;
    const depositChannelCreationEnabled = ingressEgress.deposit_channel_creation_enabled;

    return {
      asset,
      boostDepositsEnabled: canDeposit && ingressEgress.boost_deposits_enabled,
      egressEnabled:
        isEnabled &&
        safeModeStatuses.swapping.withdrawals_enabled &&
        (broadcast.egress_witnessing_enabled ?? true) &&
        !env.DISABLED_DESTINATION_INTERNAL_ASSETS.has(asset),
      vaultSwapDepositsEnabled: canDeposit && vaultSwapDepositsEnabled,
      depositChannelDepositsEnabled: canDeposit && depositChannelDepositsEnabled,
      depositChannelCreationEnabled: canDeposit && depositChannelCreationEnabled,
    };
  });

  return {
    assets: assetInfo,
    cfBrokerCommissionBps: env.BROKER_COMMISSION_BPS,
  };
};

export default networkInfo;
