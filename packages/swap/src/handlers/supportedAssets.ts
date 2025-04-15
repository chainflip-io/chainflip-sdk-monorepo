import HttpClient from '@chainflip/rpc/HttpClient';
import { ChainflipAsset, getInternalAsset } from '@chainflip/utils/chainflip';
import { AsyncCacheMap } from '@/shared/dataStructures';
import env from '../config/env';

const httpClient = new HttpClient(env.RPC_NODE_HTTP_URL);

const cache = new AsyncCacheMap({
  fetch: async (_key: 'assets') => {
    const assets = await httpClient.sendRequest('cf_supported_assets');
    return assets.map((a) => getInternalAsset(a));
  },
  ttl: 1000 * 60 * 5,
  resetExpiryOnLookup: false,
});

const supportedAssets = async (): Promise<{
  deposit: ChainflipAsset[];
  destination: ChainflipAsset[];
  all: ChainflipAsset[];
}> => {
  const assets = await cache.get('assets');

  const enabledAssets = assets.filter((a) => !env.FULLY_DISABLED_INTERNAL_ASSETS.has(a));

  const depositAssets = enabledAssets.filter((a) => !env.DISABLED_DEPOSIT_INTERNAL_ASSETS.has(a));

  const destinationAssets = enabledAssets.filter(
    (a) => !env.DISABLED_DESTINATION_INTERNAL_ASSETS.has(a),
  );

  return { deposit: depositAssets, destination: destinationAssets, all: enabledAssets };
};

export default supportedAssets;
