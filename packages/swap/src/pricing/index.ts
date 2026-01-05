import { deferredPromise } from '@chainflip/utils/async';
import { ChainflipAsset } from '@chainflip/utils/chainflip';
import axios from 'axios';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const COINGECKO_VS_CURRENCY = 'usd';

// https://api.coingecko.com/api/v3/coins/list?include_platform=true
export const coinGeckoIdMap = {
  Flip: 'chainflip',
  Usdc: 'usd-coin',
  Dot: 'polkadot',
  Eth: 'ethereum',
  Btc: 'bitcoin',
  Usdt: 'tether',
  Wbtc: 'wrapped-bitcoin',
  ArbEth: 'ethereum',
  ArbUsdc: 'usd-coin',
  ArbUsdt: 'tether',
  Sol: 'solana',
  SolUsdc: 'usd-coin',
  HubDot: 'polkadot',
  HubUsdc: 'usd-coin',
  HubUsdt: 'tether',
} as const satisfies Record<ChainflipAsset, string>;

type CoingeckoId = (typeof coinGeckoIdMap)[ChainflipAsset];

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

  cache: { [A in ChainflipAsset]?: number } = {};

  lastCacheSet = 0;

  fetchPromise: Promise<void> | undefined;

  freshEnough() {
    return Date.now() - this.lastCacheSet < PriceCache.TTL;
  }

  async getAssetPrice(asset: ChainflipAsset): Promise<number | undefined> {
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
        [A in ChainflipAsset]: [A, (typeof coinGeckoIdMap)[A]];
      }[ChainflipAsset][];

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
