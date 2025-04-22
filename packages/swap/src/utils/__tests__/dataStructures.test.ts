import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { AsyncCacheMap, Cache, CacheMap } from '@/shared/dataStructures.js';

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

describe(Cache, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('caches values for the TTL', async () => {
    vi.useFakeTimers({ now: 0 });

    let n = 0;

    const cache = new Cache({
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

    const cache = new Cache({
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
