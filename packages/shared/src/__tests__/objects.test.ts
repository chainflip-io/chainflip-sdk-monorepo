import { describe, expect, it } from 'vitest';
import { stringifyBigInts } from '../objects.js';

describe(stringifyBigInts, () => {
  it('stringifies all the bigints', () => {
    expect(
      stringifyBigInts({
        easy: 1n,
        nested: {
          value: 2n,
          array: [3n, 4n],
          deep: {
            value: 5n,
            array: [6n, 7n],
          },
        },
      }),
    ).toMatchInlineSnapshot(`
      {
        "easy": "1",
        "nested": {
          "array": [
            "3",
            "4",
          ],
          "deep": {
            "array": [
              "6",
              "7",
            ],
            "value": "5",
          },
          "value": "2",
        },
      }
    `);
  });
});
