export const getFulfilledResult = <T>(promise: PromiseSettledResult<T>, defaultValue: T) =>
  promise.status === 'fulfilled' ? promise.value : defaultValue;
