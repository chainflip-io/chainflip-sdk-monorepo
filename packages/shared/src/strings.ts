export type ToCamelCase<S extends string> = S extends `${infer P}_${infer Rest}`
  ? `${Lowercase<P>}${Capitalize<ToCamelCase<Rest>>}`
  : S;

export type CamelCaseToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${CamelCaseToSnakeCase<U>}`
  : S;

export const camelToSnakeCase = <const T extends string>(str: T): CamelCaseToSnakeCase<T> =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`) as CamelCaseToSnakeCase<T>;

export const toCamelCase = <T extends string>(str: T): ToCamelCase<T> =>
  str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) as ToCamelCase<T>;

export const toUpperCase = <const T extends string>(value: T) =>
  value.toUpperCase() as Uppercase<T>;

type ScreamingSnakeCaseToPascalCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${Capitalize<Lowercase<T>>}${ScreamingSnakeCaseToPascalCase<U>}`
  : Capitalize<Lowercase<S>>;

export const screamingSnakeToPascalCase = <const T extends string>(value: T) =>
  value
    .split('_')
    .map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join('') as ScreamingSnakeCaseToPascalCase<T>;

type RemoveLeadingUnderscore<T> = T extends `_${infer U}` ? U : T;

type InjectUnderscores<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Uppercase<T>}${InjectUnderscores<U>}`
  : Uppercase<S>;

type PascalCaseToScreamingSnakeCase<T extends string> = RemoveLeadingUnderscore<
  InjectUnderscores<T>
>;

export const pascalCaseToScreamingSnakeCase = <const T extends string>(value: T) =>
  value
    .replaceAll(/(?<=.)[A-Z]/g, (letter) => `_${letter}`)
    .toUpperCase() as PascalCaseToScreamingSnakeCase<T>;
