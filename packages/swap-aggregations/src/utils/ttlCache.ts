// Small in-memory cache of promises with a time-to-live.
//
// Caching the promise (not the value) also deduplicates concurrent requests: many status pages
// polling the same swap at the same moment share one upstream call. Rejected promises are evicted
// immediately so errors are never cached. Per pod only; that's fine for request deduplication.
export const createTtlCache = <T>(ttlMs: number, maxEntries = 10_000) => {
  const entries = new Map<string, { value: Promise<T>; expiresAt: number }>();

  const evictExpired = (now: number) => {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= now) entries.delete(key);
    }
  };

  return {
    get(key: string, load: () => Promise<T>, shouldCache: (value: T) => boolean = () => true) {
      const now = Date.now();
      const cached = entries.get(key);
      if (cached && cached.expiresAt > now) return cached.value;

      if (entries.size >= maxEntries) evictExpired(now);

      const value = load().then(
        (result) => {
          if (!shouldCache(result)) entries.delete(key);
          return result;
        },
        (error: unknown) => {
          entries.delete(key);
          throw error;
        },
      );
      entries.set(key, { value, expiresAt: now + ttlMs });
      return value;
    },
    clear() {
      entries.clear();
    },
  };
};
