import { ToCamelCase, toCamelCase } from './strings.js';

type CamelCaseKeys<T> = T extends (infer U)[]
  ? U extends object
    ? CamelCaseKeys<U>[] // If it's an array of objects, transform the objects
    : T // If it's an array of primitives, leave it unchanged
  : T extends object
    ? {
        [K in keyof T as ToCamelCase<string & K>]: CamelCaseKeys<T[K]>;
      }
    : T extends bigint
      ? string // Convert bigint to string
      : T; // Leave other types unchanged

export const formatResponse = <T>(obj: T): CamelCaseKeys<T> => {
  if (Array.isArray(obj)) {
    return obj.map(formatResponse) as unknown as CamelCaseKeys<T>;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toCamelCase(key),
        formatResponse(value as Record<string, unknown>),
      ]),
    ) as CamelCaseKeys<T>;
  }
  if (typeof obj === 'bigint') return obj.toString() as CamelCaseKeys<T>;
  return obj as CamelCaseKeys<T>;
};
