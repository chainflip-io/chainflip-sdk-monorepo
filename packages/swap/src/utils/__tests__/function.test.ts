import { describe, expect, it, vi } from 'vitest';
import * as rpc from '@/shared/rpc/index.js';
import env from '../../config/env.js';
import { isAtLeastSpecVersion, memoize } from '../function.js';

vi.mock('@/shared/rpc/index.js');

describe(isAtLeastSpecVersion, () => {
  it('handles 1.7.10', async () => {
    vi.mocked(rpc.getRuntimeVersion).mockResolvedValueOnce({ specVersion: 10710 } as any);

    expect(await isAtLeastSpecVersion('1.8.0')).toBe(false);

    vi.mocked(rpc.getRuntimeVersion).mockResolvedValueOnce({ specVersion: 10710 } as any);

    expect(await isAtLeastSpecVersion('1.7.9')).toBe(true);
  });

  it('handles 1.7.9', async () => {
    vi.mocked(rpc.getRuntimeVersion).mockResolvedValueOnce({ specVersion: 10709 } as any);

    expect(await isAtLeastSpecVersion('1.8.0')).toBe(false);
  });

  it('handles 1.8.0', async () => {
    vi.mocked(rpc.getRuntimeVersion).mockResolvedValueOnce({ specVersion: 10800 } as any);

    expect(await isAtLeastSpecVersion('1.8.0')).toBe(true);
  });

  it('handles 1.7.9 (3 digits)', async () => {
    vi.mocked(rpc.getRuntimeVersion).mockResolvedValueOnce({ specVersion: 179 } as any);

    expect(await isAtLeastSpecVersion('1.8.0')).toBe(false);
  });
});

describe(memoize, () => {
  // memoize bypasses cache when NODE_ENV === 'test', so we override it for these tests
  const originalNodeEnv = env.NODE_ENV;

  it('caches the result within the ttl', () => {
    env.NODE_ENV = 'production';
    try {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn, 60_000);

      expect(memoized(1)).toBe(2);
      expect(memoized(1)).toBe(2);
      expect(fn).toHaveBeenCalledTimes(1);
    } finally {
      env.NODE_ENV = originalNodeEnv;
    }
  });

  it('re-fetches after ttl expires', () => {
    env.NODE_ENV = 'production';
    try {
      vi.useFakeTimers();
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn, 1000);

      expect(memoized(1)).toBe(2);
      expect(fn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1001);

      expect(memoized(1)).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
      env.NODE_ENV = originalNodeEnv;
    }
  });

  it('refresh forces a re-fetch and resets the ttl', () => {
    env.NODE_ENV = 'production';
    try {
      vi.useFakeTimers();
      let callCount = 0;
      const fn = vi.fn(() => {
        callCount += 1;
        return callCount;
      });
      const memoized = memoize(fn, 1000);

      expect(memoized()).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);

      // refresh before ttl expires should still re-fetch
      expect(memoized.refresh()).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);

      // subsequent get returns the refreshed value without re-fetching
      expect(memoized()).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);

      // ttl resets from the refresh call, so advancing 999ms should still be cached
      vi.advanceTimersByTime(999);
      expect(memoized()).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);

      // after full ttl from refresh, should re-fetch
      vi.advanceTimersByTime(2);
      expect(memoized()).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
      env.NODE_ENV = originalNodeEnv;
    }
  });

  it('serves stale value during async revalidation on ttl expiry', async () => {
    env.NODE_ENV = 'production';
    vi.useFakeTimers();
    try {
      let resolveRevalidation!: (value: number) => void;
      let callCount = 0;
      const fn = vi.fn(
        () =>
          new Promise<number>((resolve) => {
            callCount += 1;
            if (callCount === 1) {
              resolve(1);
            } else {
              resolveRevalidation = resolve;
            }
          }),
      );
      const memoized = memoize(fn, 1000);

      // initial call
      expect(await memoized()).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);

      // expire ttl — triggers background revalidation
      vi.advanceTimersByTime(1001);
      const staleResult = memoized();

      // should return the old (stale) promise while revalidation is in-flight
      expect(await staleResult).toBe(1);
      expect(fn).toHaveBeenCalledTimes(2);

      // resolve the revalidation
      resolveRevalidation(2);

      // allow microtask to flush
      await Promise.resolve();

      // now returns the fresh value
      expect(await memoized()).toBe(2);
    } finally {
      vi.useRealTimers();
      env.NODE_ENV = originalNodeEnv;
    }
  });

  it('async revalidation failure keeps stale value', async () => {
    env.NODE_ENV = 'production';
    vi.useFakeTimers();
    try {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount += 1;
        if (callCount === 2) throw new Error('revalidation failed');
        return callCount;
      });
      const memoized = memoize(fn, 1000);

      expect(await memoized()).toBe(1);

      vi.advanceTimersByTime(1001);

      // triggers revalidation which will fail
      const stale = memoized();
      expect(await stale).toBe(1);

      // allow rejection microtask to flush
      await Promise.resolve();
      await Promise.resolve();

      // stale value preserved after failed revalidation
      expect(await memoized()).toBe(1);
    } finally {
      vi.useRealTimers();
      env.NODE_ENV = originalNodeEnv;
    }
  });

  it('concurrent async refresh uses latest result', async () => {
    env.NODE_ENV = 'production';
    try {
      let resolveFirst!: (value: number) => void;
      let resolveSecond!: (value: number) => void;
      let callCount = 0;
      const fn = vi.fn(
        () =>
          new Promise<number>((resolve) => {
            callCount += 1;
            if (callCount === 1)
              resolve(1); // initial
            else if (callCount === 2) resolveFirst = resolve;
            else resolveSecond = resolve;
          }),
      );
      const memoized = memoize(fn, 60_000);

      // seed
      expect(await memoized()).toBe(1);

      // two concurrent refreshes
      const r1 = memoized.refresh();
      const r2 = memoized.refresh();

      // resolve in reverse order
      resolveSecond(3);
      await Promise.resolve();

      resolveFirst(2);
      await Promise.resolve();

      expect(await r1).toBe(2);
      expect(await r2).toBe(3);

      // cache should have value from the latest refresh (3), not the older one (2)
      expect(await memoized()).toBe(3);
    } finally {
      env.NODE_ENV = originalNodeEnv;
    }
  });

  it('refresh works with async functions', async () => {
    env.NODE_ENV = 'production';
    try {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount += 1;
        return callCount;
      });
      const memoized = memoize(fn, 60_000);

      expect(await memoized()).toBe(1);
      expect(await memoized()).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);

      expect(await memoized.refresh()).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);

      // cached value is now the refreshed one
      expect(await memoized()).toBe(2);
      expect(fn).toHaveBeenCalledTimes(2);
    } finally {
      env.NODE_ENV = originalNodeEnv;
    }
  });
});
