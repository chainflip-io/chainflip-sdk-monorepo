import { request } from 'graphql-request';
import { Asset } from '@/shared/enums';
import env from '../config/env';
import { gql } from '../gql/generated';
import { CacheMap } from '../utils/dataStructures';
import logger from '../utils/logger';
import { deferredPromise } from '../utils/promise';

type ChainAndAddress = {
  chainId: string;
  address: string;
};

// TODO: refactor to use internal asset
export const chainflipAssetTokens: Record<Asset, ChainAndAddress> = {
  FLIP: {
    chainId: 'evm-1',
    address: '0x826180541412D574cf1336d22c0C0a287822678A',
  },
  USDC: {
    chainId: 'evm-1',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  DOT: {
    chainId: 'dot',
    address: '0x0000000000000000000000000000000000000000',
  },
  ETH: {
    chainId: 'evm-1',
    address: '0x0000000000000000000000000000000000000000',
  },
  BTC: {
    chainId: 'btc',
    address: '0x0000000000000000000000000000000000000000',
  },
};

const priceCache = new CacheMap<string, Promise<number | undefined>>(10_000);

export const GET_TOKEN_PRICE = gql(/* GraphQL */ `
  query GetTokenPrice($address: String!, $chainId: String!) {
    tokenPrice: getTokenPrices(
      input: [{ address: $address, chainId: $chainId }]
    ) {
      chainId
      address
      usdPrice
    }
  }
`);

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

  const prices = await request(env.CACHE_GATEWAY_URL, GET_TOKEN_PRICE, {
    ...chainflipAssetTokens[asset],
  });

  const price = prices.tokenPrice?.at(0)?.usdPrice;
  resolve(price);

  if (env.NODE_ENV === 'test' || price === undefined) {
    priceCache.delete(asset);
  }

  logger.debug(`price for "${asset}": ${price}`);

  return price;
};
