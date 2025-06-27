import { describe, expect, it } from 'vitest';
import { stringifyBigInts } from '../objects.js';

describe(stringifyBigInts, () => {
  it('stringifies all the bigints', () => {
    expect(
      stringifyBigInts({
        easy: 1n,
        value: null,
        nested: {
          value: 2n,
          array: [3n, 4n],
          number: 1,
          deep: {
            value: 5n,
            array: [6n, 7n],
            bool: false,
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
            "bool": false,
            "value": "5",
          },
          "number": 1,
          "value": "2",
        },
        "value": null,
      }
    `);
  });
});
