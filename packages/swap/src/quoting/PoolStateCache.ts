import assert from 'assert';
import { setTimeout as sleep } from 'timers/promises';
import { InternalAsset, InternalAssets, getAssetAndChain } from '@/shared/enums';
import { getBlockHash, getPoolOrders, getPoolPriceV2 } from '@/shared/rpc';
import env from '../config/env';
import { AsyncCacheMap } from '../utils/dataStructures';
import { handleExit } from '../utils/function';
import logger from '../utils/logger';

const rpcConfig = { rpcUrl: env.RPC_NODE_HTTP_URL };

type BaseAsset = Exclude<InternalAsset, 'Usdc'>;

const baseAssets = (Object.keys(InternalAssets) as InternalAsset[]).filter(
  (asset): asset is BaseAsset => asset !== 'Usdc',
);

type PoolState = {
  poolState: string;
  rangeOrderPrice: bigint;
};

const fetchPoolState = async (hash: string) =>
  Object.fromEntries(
    await Promise.all(
      baseAssets.map(async (asset) => {
        const [orders, price] = await Promise.all([
          getPoolOrders(rpcConfig, getAssetAndChain(asset), getAssetAndChain('Usdc'), hash),
          getPoolPriceV2(rpcConfig, getAssetAndChain(asset), getAssetAndChain('Usdc'), hash),
        ]);

        return [asset, { poolState: orders, rangeOrderPrice: price.rangeOrder }] as const;
      }),
    ),
  ) as Record<BaseAsset, PoolState>;

export default class PoolStateCache {
  private running = false;

  private latestHash: string | null = null;

  private age = 0;

  private cleanup?: () => void;

  private cacheMap = new AsyncCacheMap<string, Record<BaseAsset, PoolState>>({
    resetExpiryOnLookup: false,
    ttl: 10_000,
    fetch: fetchPoolState,
  });

  start() {
    if (this.running) return this;

    this.running = true;

    this.cleanup = handleExit(() => {
      this.stop();
    });

    this.startPolling();

    return this;
  }

  stop() {
    this.running = false;
    this.cleanup?.();
  }

  private async startPolling() {
    while (this.running) {
      const hash = await getBlockHash(rpcConfig).catch(() => null);

      if (hash !== null && hash !== this.latestHash) {
        this.latestHash = hash;

        const success = await this.cacheMap.load(hash);

        if (success) {
          this.age = Date.now();
        } else {
          logger.error('failed to fetch pool state', { hash });
        }
      }

      await sleep(1_000);
    }
  }

  async getPoolState(asset: BaseAsset) {
    while (this.latestHash === null && this.running) {
      await sleep(1_000);
    }

    assert(this.latestHash !== null && Date.now() - this.age < 10_000, 'cache should be fresh');

    const cache = await this.cacheMap.get(this.latestHash);

    assert(cache !== undefined, 'cache should be present');

    return cache[asset];
  }
}
