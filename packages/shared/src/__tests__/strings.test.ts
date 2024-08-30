import { pascalCaseToScreamingSnakeCase, screamingSnakeToPascalCase } from '../strings';

describe(screamingSnakeToPascalCase, () => {
  it.each([
    ['SOME_STRING', 'SomeString'],
    ['SOME_STRING_WITH_MORE_WORDS', 'SomeStringWithMoreWords'],
    ['FOO', 'Foo'],
  ])('properly formats %s', (input, expected) => {
    expect(screamingSnakeToPascalCase(input)).toBe(expected);
  });
});

describe(pascalCaseToScreamingSnakeCase, () => {
  it.each([
    ['SomeString', 'SOME_STRING'],
    ['SomeStringWithMoreWords', 'SOME_STRING_WITH_MORE_WORDS'],
    ['Foo', 'FOO'],
  ])('properly formats %s', (input, expected) => {
    expect(pascalCaseToScreamingSnakeCase(input)).toBe(expected);
  });
});
