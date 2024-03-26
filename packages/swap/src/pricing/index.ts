import axios from 'axios';
import { InternalAsset } from '@/shared/enums';
import env from '../config/env';
import { CacheMap } from '../utils/dataStructures';
import logger from '../utils/logger';
import { deferredPromise } from '../utils/promise';

const COINGECKO_VS_CURRENCY = 'usd';

// https://api.coingecko.com/api/v3/coins/list?include_platform=true
const coinGeckoIdMap: Record<InternalAsset, string> = {
  Flip: 'chainflip',
  Usdc: 'usd-coin',
  Dot: 'polkadot',
  Eth: 'ethereum',
  Btc: 'bitcoin',
  Usdt: 'tether',
};
const priceCache = new CacheMap<string, Promise<number | undefined>>(30_000);

const coingeckoAxios = axios.create({
  baseURL: 'https://pro-api.coingecko.com/api/v3',
  timeout: 5000,
  headers: { 'x-cg-pro-api-key': env.COINGECKO_API_KEY },
});

export const getAssetPrice = async (asset: InternalAsset): Promise<number | undefined> => {
  logger.debug(`getting asset price for "${asset}"`);

  const cachedPrice = priceCache.get(asset);

  if (cachedPrice) {
    logger.debug(`found cached price for "${asset}": ${await cachedPrice}`);
    return cachedPrice;
  }

  const { promise, resolve } = deferredPromise<number | undefined>();

  priceCache.set(asset, promise);

  logger.debug(`fetching price for "${asset}"`);

  const response = await coingeckoAxios.get(
    `/simple/price?vs_currencies=${COINGECKO_VS_CURRENCY}&ids=${coinGeckoIdMap[asset]}`,
  );

  const price = response.data[coinGeckoIdMap[asset]][COINGECKO_VS_CURRENCY];

  resolve(price);

  if (env.NODE_ENV === 'test' || price === undefined) {
    priceCache.delete(asset);
  }

  logger.debug(`price for "${asset}": ${price}`);

  return price;
};
