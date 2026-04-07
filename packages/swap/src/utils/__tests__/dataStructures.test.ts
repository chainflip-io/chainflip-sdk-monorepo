import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { AsyncCacheMap, MultiCache, CacheMap } from '@/shared/dataStructures.js';

describe(CacheMap, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deletes values and clears timeouts', () => {
    const map = new CacheMap<string, string>(10);
    const spy = vi.spyOn(globalThis, 'clearTimeout');
    map.set('hello', 'world');
    map.delete('hello');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(map.get('hello')).toBe(undefined);
  });

  it('expires values properly', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const map = new CacheMap<string, string>(10);
    map.set('hello', 'world');

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);
    expect(map.get('hello')).toBe(undefined);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('caches a value and resets the timer on access', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const map = new CacheMap<string, string>(10);
    map.set('hello', 'world');

    vi.advanceTimersByTime(9);
    expect(map.get('hello')).toBe('world');

    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(9);
    expect(map.get('hello')).toBe('world');

    expect(setTimeoutSpy).toHaveBeenCalledTimes(3);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('does not refresh keys if not desired', () => {
    const map = new CacheMap<string, string>(10, false);
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

    map.set('hello', 'world');

    expect(map.get('hello')).not.toBeUndefined();
    expect(map.get('hello')).not.toBeUndefined();
    expect(map.get('hello')).not.toBeUndefined();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10);

    expect(map.get('hello')).toBeUndefined();
  });
});

describe(AsyncCacheMap, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches values and caches them', async () => {
    let id = 0;

    // eslint-disable-next-line no-plusplus
    const fetch = vi.fn(async (key: string) => `${key}${id++}`);

    const map = new AsyncCacheMap({ ttl: 10, fetch });

    const hello0 = await Promise.race([map.get('hello'), map.get('hello'), map.get('hello')]);

    expect(hello0).toBe('hello0');
    expect(fetch).toHaveBeenCalledTimes(1);

    const world1 = await map.get('world');
    expect(world1).toBe('world1');
    expect(fetch).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(10);

    const hello2 = await map.get('hello');
    expect(hello2).toBe('hello2');
  });

  it('refreshes cached value by re-fetching', async () => {
    let id = 0;

    // eslint-disable-next-line no-plusplus
    const fetch = vi.fn(async (key: string) => `${key}${id++}`);

    const map = new AsyncCacheMap({ ttl: 10, fetch });

    expect(await map.get('hello')).toBe('hello0');
    expect(fetch).toHaveBeenCalledTimes(1);

    expect(await map.refresh('hello')).toBe('hello1');
    expect(fetch).toHaveBeenCalledTimes(2);

    expect(await map.get('hello')).toBe('hello1');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('refresh resets the TTL so cache stays fresh', async () => {
    let id = 0;

    // eslint-disable-next-line no-plusplus
    const fetch = vi.fn(async (key: string) => `${key}${id++}`);

    const map = new AsyncCacheMap({ ttl: 60_000, fetch, resetExpiryOnLookup: false });

    expect(await map.get('hello')).toBe('hello0');

    // advance to just before expiry and refresh
    vi.advanceTimersByTime(59_999);
    expect(await map.refresh('hello')).toBe('hello1');

    // after another 60s the refreshed value is still cached
    vi.advanceTimersByTime(59_999);
    expect(await map.get('hello')).toBe('hello1');
    expect(fetch).toHaveBeenCalledTimes(2);

    // once the full TTL passes from the refresh, it expires
    vi.advanceTimersByTime(1);
    expect(await map.get('hello')).toBe('hello2');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('refresh keeps stale data on fetch failure', async () => {
    let count = 0;

    const fetch = vi.fn(async (key: string) => {
      // eslint-disable-next-line no-plusplus
      if (count++ === 1) throw new Error('refresh failed');
      return `${key}${count}`;
    });

    const map = new AsyncCacheMap({ ttl: 10, fetch });

    expect(await map.get('hello')).toBe('hello1');

    await expect(() => map.refresh('hello')).rejects.toThrow('refresh failed');

    // stale data is preserved on refresh failure
    expect(await map.get('hello')).toBe('hello1');
  });

  it('serves stale data during refresh (stale-while-revalidate)', async () => {
    let resolveRefresh!: (value: string) => void;

    let id = 0;
    const fetch = vi.fn((key: string) =>
      // eslint-disable-next-line no-plusplus
      id++ === 0
        ? Promise.resolve(`${key}0`)
        : new Promise<string>((resolve) => {
            resolveRefresh = resolve;
          }),
    );

    const map = new AsyncCacheMap({ ttl: 10, fetch });

    // initial fetch
    expect(await map.get('hello')).toBe('hello0');

    // start a refresh — the new fetch is pending
    const refreshPromise = map.refresh('hello');

    // concurrent get() calls should still return the stale data
    expect(await map.get('hello')).toBe('hello0');

    // resolve the refresh
    resolveRefresh('hello1');
    expect(await refreshPromise).toBe('hello1');

    // now get() returns the fresh data
    expect(await map.get('hello')).toBe('hello1');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('removes rejected promises', async () => {
    let count = 0;

    const fetch = vi.fn(async (key: string) => {
      // eslint-disable-next-line no-plusplus
      if (count++ === 0) throw new Error('nope');
      return `hello ${key}`;
    });

    const map = new AsyncCacheMap({ ttl: 10, fetch });

    await expect(() => map.get('hello')).rejects.toThrow('nope');
    expect(await map.get('world')).toBe('hello world');
  });
});

describe(MultiCache, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('caches values for the TTL', async () => {
    vi.useFakeTimers({ now: 0 });

    let n = 0;

    const cache = new MultiCache({
      inc: {
        async fetch() {
          n += 1;
          return n;
        },
        ttl: 10_000,
      },
    });

    await expect(cache.read('inc')).resolves.toBe(1);
    vi.advanceTimersByTime(5_000);
    await expect(cache.read('inc')).resolves.toBe(1);
    vi.advanceTimersByTime(5_000);
    await expect(cache.read('inc')).resolves.toBe(1);
    vi.advanceTimersByTime(1);
    await expect(cache.read('inc')).resolves.toBe(2);
  });

  it('fetches fresh if the fetch fails', async () => {
    let n = 0;

    const cache = new MultiCache({
      inc: {
        async fetch() {
          n += 1;
          if (n === 1) throw new Error('try again');
          return n;
        },
        ttl: 10_000,
      },
    });

    await expect(cache.read('inc')).rejects.toThrow('try again');
    await expect(cache.read('inc')).resolves.toBe(2);
  });
});
