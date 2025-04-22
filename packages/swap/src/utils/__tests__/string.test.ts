import { describe, it, expect } from 'vitest';
import { compareNumericStrings, Comparison } from '../string.js';

describe(compareNumericStrings, () => {
  it.each([
    ['1', '1', Comparison.Equal],
    ['1', '2', Comparison.Less],
    ['2', '1', Comparison.Greater],
  ])(`compares %s to %s`, (a, b, expected) => {
    expect(compareNumericStrings(a, b)).toBe(expected);
  });
});
