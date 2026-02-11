import { deferredPromise } from '@chainflip/utils/async';
import { ChainflipAsset } from '@chainflip/utils/chainflip';
import axios from 'axios';
import { vi, describe, expect, it, beforeEach } from 'vitest';
import logger from '../../utils/logger.js';
import { coinGeckoIdMap, PriceCache } from '../index.js';

vi.unmock('../index.js');

vi.mock('axios', async () => ({
  default: {
    create() {
      return this;
    },
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const NOW = 1711457574588;

const priceMap = {
  Btc: 70880.91563990324,
  Flip: 6.102661601815284,
  Eth: 3638.78272243294,
  Dot: 9.914487887030168,
  Usdt: 0.9996396835618839,
  Usdc: 0.9989897393887496,
  Wbtc: 70880.91563990324,
  ArbEth: 3638.78272243294,
  ArbUsdc: 0.9989897393887496,
  ArbUsdt: 0.9996396835618839,
  Sol: 150.1234,
  SolUsdc: 0.9989897393887496,
  SolUsdt: 0.9996396835618839,
  HubDot: 9.914487887030168,
  HubUsdc: 0.9989897393887496,
  HubUsdt: 0.9996396835618839,
} as const satisfies Record<ChainflipAsset, number>;

describe(PriceCache, () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches all the assets at once', async () => {
    const cache = new PriceCache();

    const getSpy = vi.mocked(axios.get).mockRejectedValue(Error('unhandled mock'));

    getSpy.mockResolvedValueOnce({
      data: Object.fromEntries(
        Object.entries(coinGeckoIdMap).map(([asset, id]) => [
          id,
          { usd: priceMap[asset as ChainflipAsset] },
        ]),
      ),
    });

    for (const asset of Object.keys(coinGeckoIdMap) as ChainflipAsset[]) {
      expect(await cache.getAssetPrice(asset)).toEqual(priceMap[asset]);
    }
  });

  it('caches the prices for 30 seconds', async () => {
    const cache = new PriceCache();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const getSpy = vi.mocked(axios.get).mockRejectedValue(Error('unhandled mock'));

    getSpy.mockResolvedValueOnce({
      data: Object.fromEntries(
        Object.entries(coinGeckoIdMap).map(([asset, id]) => [
          id,
          { usd: priceMap[asset as ChainflipAsset] },
        ]),
      ),
    });

    expect(await cache.getAssetPrice('Eth')).toEqual(priceMap.Eth);
    nowSpy.mockReturnValue(NOW + 29_999);
    expect(await cache.getAssetPrice('Eth')).toEqual(priceMap.Eth);
    nowSpy.mockReturnValue(NOW + 30_000);
    await expect(cache.getAssetPrice('Eth')).rejects.toThrow('unhandled mock');
  });

  it('only allows one request to refetch at a time', async () => {
    const cache = new PriceCache();

    const getSpy = vi.mocked(axios.get).mockRejectedValue(Error('unhandled mock'));

    const { promise, resolve } = deferredPromise<void>();

    const data = Object.fromEntries(
      Object.entries(coinGeckoIdMap).map(([asset, id]) => [
        id,
        { usd: priceMap[asset as ChainflipAsset] as number | undefined },
      ]),
    );

    getSpy.mockReturnValueOnce(
      promise.then(() => ({
        data,
      })),
    );

    const first = cache.getAssetPrice('Eth');
    const second = cache.getAssetPrice('Eth');
    const third = cache.getAssetPrice('Eth');

    resolve();

    expect(await first).toEqual(priceMap.Eth);
    expect(await second).toEqual(priceMap.Eth);
    expect(await third).toEqual(priceMap.Eth);
    expect(getSpy).toHaveBeenCalledTimes(1);
  });

  it('logs an error when a price is missing', async () => {
    const errorSpy = vi.spyOn(logger, 'error');
    const cache = new PriceCache();

    const getSpy = vi.mocked(axios.get).mockRejectedValue(Error('unhandled mock'));

    const data = Object.fromEntries(
      Object.entries(coinGeckoIdMap).map(([asset, id]) => [
        id,
        { usd: priceMap[asset as ChainflipAsset] as number | undefined },
      ]),
    );

    delete data[coinGeckoIdMap.Btc].usd;

    getSpy.mockResolvedValueOnce({ data });

    expect(await cache.getAssetPrice('Btc')).toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('price for "Btc" is undefined');
  });

  it('refetches prices', async () => {
    const cache = new PriceCache();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(NOW);
    const getSpy = vi.mocked(axios.get).mockRejectedValue(Error('unhandled mock'));

    const data = Object.fromEntries(
      Object.entries(coinGeckoIdMap).map(([asset, id]) => [
        id,
        { usd: priceMap[asset as ChainflipAsset] as number | undefined },
      ]),
    );

    getSpy.mockResolvedValueOnce({ data });

    expect(await cache.getAssetPrice('Btc')).toEqual(priceMap.Btc);

    nowSpy.mockReturnValue(NOW + 30_000);

    const { promise, resolve } = deferredPromise<void>();

    getSpy.mockReturnValue(
      promise.then(() => ({ data: { ...data, bitcoin: { usd: 60_000.1234 } } })),
    );
    const first = cache.getAssetPrice('Btc');
    const second = cache.getAssetPrice('Btc');
    const third = cache.getAssetPrice('Btc');

    resolve();

    expect(await first).toEqual(60_000.1234);
    expect(await second).toEqual(60_000.1234);
    expect(await third).toEqual(60_000.1234);
    expect(getSpy).toHaveBeenCalledTimes(2);
  });
});
