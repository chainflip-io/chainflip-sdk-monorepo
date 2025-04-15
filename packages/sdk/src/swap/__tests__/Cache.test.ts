import { afterEach, describe, expect, it, vi } from 'vitest';
import Cache from '../Cache';

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
