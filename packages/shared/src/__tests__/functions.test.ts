import { calculateBpsAmountFromAmount } from '../functions';

describe(calculateBpsAmountFromAmount, () => {
  it.each([
    [100n, 10000000n, 100000n],
    [100n, 250n, 2n],
    [100n, 0n, 0n],
    [100n, 1n, 0n],
  ])('calculates bps from amount', (bps, amount, result) => {
    expect(calculateBpsAmountFromAmount(bps, amount)).toBe(result);
  });
});
