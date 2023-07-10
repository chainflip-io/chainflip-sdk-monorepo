export const isString = (value: unknown): value is string =>
  typeof value === 'string';

export const isNotNull = <T>(value: T | null): value is T => value !== null;

export function assert(condition: unknown, message: string): asserts condition {
  if (condition) return;
  const error = new Error(message);

  if (error.stack) {
    // Remove the first line of the stack, which is assert function itself
    error.stack = error.stack.replace(/\n.+/, '\n');
  }

  throw error;
}
