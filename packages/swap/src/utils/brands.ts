/**
 * Branded types are used to create types that are compatible with a base type,
 * but are not assignable to the base type. This is useful for creating types
 * that are more specific than the base type and should not be used interchangeably.
 *
 * @see https://www.learningtypescript.com/articles/branded-types
 */
export type Brand<T, B> = T & { __brand: B };
