import { ToCamelCase, toCamelCase } from './strings';

type CamelCaseKeys<T> = T extends (infer U)[]
  ? U extends object
    ? CamelCaseKeys<U>[] // If it's an array of objects, transform the objects
    : T // If it's an array of primitives, leave it unchanged
  : T extends object
    ? {
        [K in keyof T as ToCamelCase<string & K>]: CamelCaseKeys<T[K]>;
      }
    : T;

export const transformKeysToCamelCase = <T extends Record<string, unknown>>(
  obj: T,
): CamelCaseKeys<T> => {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToCamelCase) as unknown as CamelCaseKeys<T>;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toCamelCase(key),
        transformKeysToCamelCase(value as Record<string, unknown>),
      ]),
    ) as CamelCaseKeys<T>;
  }
  return obj;
};
