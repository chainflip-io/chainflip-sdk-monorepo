/* eslint-disable max-classes-per-file */
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
  fetch;

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

  override get(key: K): Promise<V> | undefined {
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
}
