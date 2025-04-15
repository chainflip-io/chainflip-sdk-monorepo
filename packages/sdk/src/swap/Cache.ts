type Fetcher<T> = () => Promise<T>;

type FetchMap = {
  [key: string]: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fetch: Fetcher<any>;
    ttl: number;
  };
};

type CacheValue<T> = T extends Fetcher<infer U> ? U : never;

/**
 * unlike `AsyncCacheMap` this doesn't use timers which is probably a bad
 * practice unless you expose some way of clearing all the timers. this also
 * allows for multiple types of values to be cached and read in safe way
 */
export default class Cache<T extends FetchMap> {
  private readonly values: {
    [K in keyof T]?: {
      timestamp: number;
      value: Promise<CacheValue<T[K]['fetch']>>;
    };
  } = {};

  constructor(private readonly fetchers: T) {}

  read<K extends keyof T>(type: K): Promise<CacheValue<T[K]['fetch']>> {
    const { fetch, ttl } = this.fetchers[type];
    let cached = this.values[type];
    if (!cached || cached.timestamp + ttl < Date.now()) {
      cached = {
        timestamp: Date.now(),
        value: fetch().catch((err) => {
          this.values[type] = undefined;
          throw err;
        }),
      };
      this.values[type] = cached;
    }
    return cached.value;
  }
}
