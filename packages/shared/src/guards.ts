import { ChainflipAsset } from '@chainflip/utils/chainflip';

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNotNull = <T>(value: T | null): value is T => value !== null;

export const isNotNullish = <T>(value: T | null | undefined): value is T =>
  value !== null && value !== undefined;

export function assert(
  condition: unknown,
  message: string,
  Constructor: typeof Error = Error,
): asserts condition {
  if (condition) return;
  const error = new Constructor(message);

  if (error.stack) {
    // Remove the first line of the stack, which is assert function itself
    error.stack = error.stack.replace(/\n.+/, '\n');
  }

  throw error;
}

export function assertNever(x: never, message: string): never {
  throw new Error(message);
}

export const isStableCoin = (
  asset: ChainflipAsset,
): asset is Extract<ChainflipAsset, `${string}Usd${string}`> => /Usd/.test(asset);

export const ensure = <T>(value: T | null | undefined, message: string): T => {
  if (value == null) throw new Error(message);
  return value;
};
