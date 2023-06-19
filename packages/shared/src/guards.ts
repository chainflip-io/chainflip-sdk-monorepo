export const isString = (value: unknown): value is string =>
  typeof value === 'string';

export const isNotNull = <T>(value: T | null): value is T => value !== null;

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
