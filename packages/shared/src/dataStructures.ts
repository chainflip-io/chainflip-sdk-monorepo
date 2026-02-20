/* eslint-disable max-classes-per-file */
import { ChainflipAsset, chainflipAssets, InternalAssetMap } from '@chainflip/utils/chainflip';

class Timer<T> {
  timeout?: ReturnType<typeof setTimeout>;

  constructor(
    readonly value: T,
    readonly cb: () => void,
    readonly ms: number,
  ) {
    this.reset(true);
  }

  reset(resetExpiryOnLookup: boolean): this {
    if (resetExpiryOnLookup) {
      this.clear();
      this.timeout = setTimeout(this.cb, this.ms);
    }
    return this;
  }

  getValue(resetExpiryOnLookup: boolean): T {
    return this.reset(resetExpiryOnLookup).value;
  }

  clear(): void {
    if (this.timeout) clearTimeout(this.timeout);
  }
}

export class CacheMap<K, V> {
  private readonly store = new Map<K, Timer<V>>();

  constructor(
    private readonly ttl: number,
    private readonly resetExpiryOnLookup = true,
  ) {}

  set(key: K, value: V): this {
    this.delete(key);

    const timer = new Timer(value, () => this.store.delete(key), this.ttl);

    this.store.set(key, timer);
    return this;
  }

  get(key: K): V | undefined {
    return this.store.get(key)?.getValue(this.resetExpiryOnLookup);
  }

  delete(key: K): boolean {
    this.store.get(key)?.clear();
    return this.store.delete(key);
  }
}

export class AsyncCacheMap<K, V> extends CacheMap<K, Promise<V>> {
  private readonly fetch;

  constructor({
    fetch,
    ttl,
    resetExpiryOnLookup = true,
  }: {
    resetExpiryOnLookup?: boolean;
    fetch: (key: K) => Promise<V>;
    ttl: number;
  }) {
    super(ttl, resetExpiryOnLookup);
    this.fetch = fetch;
  }

  override get(key: K): Promise<V> {
    let promise = super.get(key);

    if (!promise) {
      promise = this.fetch(key).catch((err) => {
        this.delete(key);
        throw err;
      });

      this.set(key, promise);
    }

    return promise;
  }

  load(key: K): Promise<boolean> {
    return this.get(key).then(
      () => true,
      () => false,
    );
  }
}

export type Fetcher<T> = () => Promise<T>;

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
export class MultiCache<T extends FetchMap> {
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

// eslint-disable-next-line @typescript-eslint/ban-types
const isFunction = (value: unknown): value is Function =>
  typeof value === 'function' && value.constructor === Function;

export function createInternalAssetMap<T>(value: T): InternalAssetMap<T>;
export function createInternalAssetMap<T>(cb: (asset: ChainflipAsset) => T): InternalAssetMap<T>;
export function createInternalAssetMap<T>(value: T | ((asset: ChainflipAsset) => T)) {
  return Object.fromEntries(
    chainflipAssets.map(
      (asset) => [asset, isFunction(value) ? value(asset) : structuredClone(value)] as const,
    ),
  ) as InternalAssetMap<T>;
}
