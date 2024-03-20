import {
  calculateHundredthPipAmountFromAmount,
  calculatePipAmountFromAmount,
} from '../functions';

describe(calculatePipAmountFromAmount, () => {
  it.each([
    ['10000000', 100, 100000n],
    ['250', 100, 2n],
    ['0', 100, 0n],
    ['1', 100, 0n],
  ])('calculates pip amount from amount', (amount, pips, result) => {
    expect(calculatePipAmountFromAmount(amount, pips)).toBe(result);
  });
});

describe(calculateHundredthPipAmountFromAmount, () => {
  it.each([
    ['10000000', 100, 1000n],
    ['10000000', 1000, 10000n],
    ['250', 100, 0n],
    ['0', 100, 0n],
    ['1', 100, 0n],
  ])(
    'calculates hundredth pip amount from amount',
    (amount, hundredthPips, result) => {
      expect(calculateHundredthPipAmountFromAmount(amount, hundredthPips)).toBe(
        result,
      );
    },
  );
});
