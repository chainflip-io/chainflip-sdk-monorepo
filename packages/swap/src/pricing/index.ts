import axios from 'axios';
import { Asset } from '@/shared/enums';
import env from '../config/env';
import { CacheMap } from '../utils/dataStructures';
import logger from '../utils/logger';
import { deferredPromise } from '../utils/promise';

const COINGECKO_VS_CURRENCY = 'usd';

// TODO: refactor to use internal asset
const coinGeckoIdMap: Record<Asset, string> = {
  FLIP: 'chainflip',
  USDC: 'usd-coin',
  DOT: 'polkadot',
  ETH: 'ethereum',
  BTC: 'bitcoin',
};
const priceCache = new CacheMap<string, Promise<number | undefined>>(10_000);

const coingeckoAxios = axios.create({
  baseURL: 'https://pro-api.coingecko.com/api/v3',
  timeout: 5000,
  headers: { 'x-cg-pro-api-key': env.COINGECKO_API_KEY },
});

export const getAssetPrice = async (
  asset: Asset,
): Promise<number | undefined> => {
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
