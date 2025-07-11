import { HttpClient } from '@chainflip/rpc';
import { RpcMethod, RpcRequest, RpcResult } from '@chainflip/rpc/common';
import { assetConstants, getInternalAsset } from '@chainflip/utils/chainflip';
import { uncapitalize } from '@chainflip/utils/string';
import z from 'zod';
import { NetworkStatusV2 } from '@/shared/api/networkStatus.js';
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

const networkStatusV2 = async (): Promise<z.output<typeof NetworkStatusV2>> => {
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
    let vaultSwapDepositsEnabled;
    let depositChannelDepositsEnabled;
    let depositChannelCreationEnabled;
    const canDeposit = isEnabled && !env.DISABLED_DEPOSIT_INTERNAL_ASSETS.has(asset);

    if ('deposits_enabled' in ingressEgress) {
      vaultSwapDepositsEnabled = ingressEgress.deposits_enabled;
      depositChannelDepositsEnabled = ingressEgress.deposits_enabled;
      depositChannelCreationEnabled = ingressEgress.deposits_enabled;
    } else {
      vaultSwapDepositsEnabled = ingressEgress.vault_deposit_witnessing_enabled;
      depositChannelDepositsEnabled = ingressEgress.deposit_channel_witnessing_enabled;
      depositChannelCreationEnabled = ingressEgress.deposit_channel_creation_enabled;
    }

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

export default networkStatusV2;
