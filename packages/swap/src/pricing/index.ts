import { deferredPromise } from '@chainflip/utils/async';
import axios from 'axios';
import { InternalAsset } from '@/shared/enums';
import env from '../config/env';
import logger from '../utils/logger';

const COINGECKO_VS_CURRENCY = 'usd';

// https://api.coingecko.com/api/v3/coins/list?include_platform=true
export const coinGeckoIdMap = {
  Flip: 'chainflip',
  Usdc: 'usd-coin',
  Dot: 'polkadot',
  Eth: 'ethereum',
  Btc: 'bitcoin',
  Usdt: 'tether',
  ArbEth: 'ethereum',
  ArbUsdc: 'usd-coin',
  Sol: 'solana',
  SolUsdc: 'usd-coin',
} as const satisfies Record<InternalAsset, string>;

type CoingeckoId = (typeof coinGeckoIdMap)[InternalAsset];

type CoingeckoPriceResponse = Record<CoingeckoId, Record<typeof COINGECKO_VS_CURRENCY, number>>;

const coingeckoAxios = env.COINGECKO_API_KEY
  ? axios.create({
      baseURL: 'https://pro-api.coingecko.com/api/v3',
      timeout: 5000,
      headers: { 'x-cg-pro-api-key': env.COINGECKO_API_KEY },
    })
  : axios.create({
      baseURL: 'https://api.coingecko.com/api/v3',
      timeout: 5000,
    });

export class PriceCache {
  static TTL = 30_000;

  cache: { [A in InternalAsset]?: number } = {};

  lastCacheSet = 0;

  fetchPromise: Promise<void> | undefined;

  freshEnough() {
    return Date.now() - this.lastCacheSet < PriceCache.TTL;
  }

  async getAssetPrice(asset: InternalAsset): Promise<number | undefined> {
    logger.debug(`getting asset price for "${asset}"`);

    if (this.freshEnough()) {
      logger.debug(`found cached price for "${asset}": ${this.cache[asset]}`);
      return this.cache[asset];
    }

    if (this.fetchPromise) {
      await this.fetchPromise;
      return this.getAssetPrice(asset);
    }

    const { promise, resolve } = deferredPromise<void>();
    this.fetchPromise = promise;

    try {
      logger.debug(`fetching price for "${asset}"`);

      const ids = Object.values(coinGeckoIdMap).join(',');

      const response = await coingeckoAxios.get(
        `/simple/price?precision=full&vs_currencies=${COINGECKO_VS_CURRENCY}&ids=${ids}`,
      );

      const entries = Object.entries(coinGeckoIdMap) as {
        [A in InternalAsset]: [A, (typeof coinGeckoIdMap)[A]];
      }[InternalAsset][];

      const coinData = response.data as CoingeckoPriceResponse;

      for (const [id, coingeckoId] of entries) {
        const price = coinData[coingeckoId][COINGECKO_VS_CURRENCY];
        if (price === undefined) logger.error(`price for "${id}" is undefined`);
        this.cache[id] = price;
      }

      this.lastCacheSet = Date.now();
      const price = this.cache[asset];

      logger.debug(`price for "${asset}": ${price}`);

      return price;
    } catch (err) {
      this.lastCacheSet = 0;
      throw err;
    } finally {
      resolve();
      this.fetchPromise = undefined;
    }
  }
}

const priceCache = new PriceCache();

export const getAssetPrice = priceCache.getAssetPrice.bind(priceCache);
