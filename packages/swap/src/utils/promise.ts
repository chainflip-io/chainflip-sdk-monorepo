export const deferredPromise = <T>() => {
  let resolve: (value: T) => void;
  let reject: (error: Error) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AsyncFn = (...args: any[]) => Promise<any>;

type AsyncReturnType<F extends AsyncFn> = Awaited<ReturnType<F>>;

/**
 * use this to wrap an async function to return a result object so no uncaught
 * promise rejections are thrown if you do not immediately await/handle it
 * @param fn an asynchronous function
 */
export const resultify =
  <F extends AsyncFn>(fn: F) =>
  (
    ...args: Parameters<F>
  ): Promise<{ data: AsyncReturnType<F>; success: true } | { reason: unknown; success: false }> =>
    fn(...args)
      .then((data) => ({ data, success: true as const }))
      .catch((reason) => ({ reason, success: false as const }));
