export type CamelCaseToSnakeCase<S extends string> =
  S extends `${infer T}${infer U}`
    ? `${T extends Capitalize<T>
        ? '_'
        : ''}${Lowercase<T>}${CamelCaseToSnakeCase<U>}`
    : S;

export const camelToSnakeCase = <const T extends string>(
  str: T,
): CamelCaseToSnakeCase<T> =>
  str.replace(
    /[A-Z]/g,
    (letter) => `_${letter.toLowerCase()}`,
  ) as CamelCaseToSnakeCase<T>;
