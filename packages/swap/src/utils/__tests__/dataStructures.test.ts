import { AsyncCacheMap, CacheMap } from '../dataStructures';

describe(CacheMap, () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('deletes values and clears timeouts', () => {
    const map = new CacheMap<string, string>(10);
    const spy = jest.spyOn(globalThis, 'clearTimeout');
    map.set('hello', 'world');
    map.delete('hello');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(map.get('hello')).toBe(undefined);
  });

  it('expires values properly', () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');

    const map = new CacheMap<string, string>(10);
    map.set('hello', 'world');

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10);
    expect(map.get('hello')).toBe(undefined);

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(clearTimeoutSpy).not.toHaveBeenCalled();
  });

  it('caches a value and resets the timer on access', () => {
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');

    const map = new CacheMap<string, string>(10);
    map.set('hello', 'world');

    jest.advanceTimersByTime(9);
    expect(map.get('hello')).toBe('world');

    expect(setTimeoutSpy).toHaveBeenCalledTimes(2);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(9);
    expect(map.get('hello')).toBe('world');

    expect(setTimeoutSpy).toHaveBeenCalledTimes(3);
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(2);
  });

  it('does not refresh keys if not desired', () => {
    const map = new CacheMap<string, string>(10, false);
    const setTimeoutSpy = jest.spyOn(globalThis, 'setTimeout');

    map.set('hello', 'world');

    expect(map.get('hello')).not.toBeUndefined();
    expect(map.get('hello')).not.toBeUndefined();
    expect(map.get('hello')).not.toBeUndefined();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(10);

    expect(map.get('hello')).toBeUndefined();
  });
});

describe(AsyncCacheMap, () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches values and caches them', async () => {
    let id = 0;

    // eslint-disable-next-line no-plusplus
    const fetch = jest.fn(async (key: string) => `${key}${id++}`);

    const map = new AsyncCacheMap({ ttl: 10, fetch });

    const hello0 = await Promise.race([map.get('hello'), map.get('hello'), map.get('hello')]);

    expect(hello0).toBe('hello0');
    expect(fetch).toHaveBeenCalledTimes(1);

    const world1 = await map.get('world');
    expect(world1).toBe('world1');
    expect(fetch).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(10);

    const hello2 = await map.get('hello');
    expect(hello2).toBe('hello2');
  });

  it('removes rejected promises', async () => {
    let count = 0;

    const fetch = jest.fn(async (key: string) => {
      // eslint-disable-next-line no-plusplus
      if (count++ === 0) throw new Error('nope');
      return `hello ${key}`;
    });

    const map = new AsyncCacheMap({ ttl: 10, fetch });

    await expect(() => map.get('hello')).rejects.toThrow('nope');
    expect(await map.get('world')).toBe('hello world');
  });
});
