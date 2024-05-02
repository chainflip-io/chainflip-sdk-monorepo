import assert from 'assert';
import { setTimeout as sleep } from 'timers/promises';
import { InternalAsset, InternalAssets, getAssetAndChain } from '@/shared/enums';
import { getBlockHash, getPoolOrders, getPoolPriceV2 } from '@/shared/rpc';
import env from '../config/env';
import { handleExit } from '../utils/function';

const rpcConfig = { rpcUrl: env.RPC_NODE_HTTP_URL };

type BaseAsset = Exclude<InternalAsset, 'Usdc'>;

const baseAssets = (Object.keys(InternalAssets) as InternalAsset[]).filter(
  (asset): asset is BaseAsset => asset !== 'Usdc',
);

type PoolState = {
  poolState: string;
  rangeOrderPrice: bigint;
};

export default class PoolStateCache {
  private running = false;

  private latestHash: string | null = null;

  private cache: Record<BaseAsset, PoolState> | null = null;

  private age = 0;

  private cleanup?: () => void;

  start() {
    this.running = true;

    this.cleanup = handleExit(() => {
      this.stop();
    });

    this.poll();

    return this;
  }

  stop() {
    this.running = false;
    this.cleanup?.();
  }

  private async poll() {
    if (!this.running) return;

    const hash = await getBlockHash(rpcConfig);

    if (hash !== this.latestHash) {
      this.latestHash = hash;

      this.cache = Object.fromEntries(
        await Promise.all(
          baseAssets.map(async (asset) => [asset, await this.fetchPoolState(asset)]),
        ),
      );

      this.age = Date.now();
    }

    setTimeout(() => this.poll(), 1000);
  }

  private async fetchPoolState(asset: Exclude<InternalAsset, 'Usdc'>) {
    const [orders, price] = await Promise.all([
      getPoolOrders(rpcConfig, getAssetAndChain(asset), getAssetAndChain('Usdc'), this.latestHash),
      getPoolPriceV2(rpcConfig, getAssetAndChain(asset), getAssetAndChain('Usdc'), this.latestHash),
    ]);

    return { poolState: orders, rangeOrderPrice: price.rangeOrder };
  }

  async getPoolState(asset: BaseAsset) {
    while (this.cache === null && this.running) {
      await sleep(1_000);
    }

    assert(this.cache !== null && Date.now() - this.age < 10_000, 'cache should be fresh');

    return this.cache[asset];
  }
}
