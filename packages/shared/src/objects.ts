import { ToCamelCase, toCamelCase } from './strings.js';

type CamelCaseKeys<T> = T extends (infer U)[]
  ? U extends object
    ? CamelCaseKeys<U>[] // If it's an array of objects, transform the objects
    : T // If it's an array of primitives, leave it unchanged
  : T extends object
    ? {
        [K in keyof T as ToCamelCase<string & K>]: CamelCaseKeys<T[K]>;
      }
    : T;

export const transformKeysToCamelCase = <T>(obj: T): CamelCaseKeys<T> => {
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
  return obj as CamelCaseKeys<T>;
};

type StringifyBigInt<T> = T extends (infer U)[]
  ? U extends object
    ? StringifyBigInt<U>[] // If it's an array of objects, transform the objects
    : T // If it's an array of primitives, leave it unchanged
  : T extends object
    ? {
        [K in keyof T]: StringifyBigInt<T[K]>; // Recursively apply to nested objects
      }
    : T extends bigint
      ? string
      : T;

export const stringifyBigInts = <T>(obj: T): StringifyBigInt<T> => {
  if (Array.isArray(obj)) {
    return obj.map(transformKeysToCamelCase) as unknown as StringifyBigInt<T>;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        toCamelCase(key),
        transformKeysToCamelCase(value as Record<string, unknown>),
      ]),
    ) as StringifyBigInt<T>;
  }
  return obj as StringifyBigInt<T>;
};
