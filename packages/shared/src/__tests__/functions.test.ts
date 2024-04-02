import { getHundredthPipAmountFromAmount, getPipAmountFromAmount } from '../functions';

describe(getPipAmountFromAmount, () => {
  it.each([
    [10000000n, 100, 100000n],
    [250n, 100, 2n],
    [0n, 100, 0n],
    [1n, 100, 0n],
  ])('calculates pip amount from amount', (amount, pips, result) => {
    expect(getPipAmountFromAmount(amount, pips)).toBe(result);
  });
});

describe(getHundredthPipAmountFromAmount, () => {
  it.each([
    [10000000n, 100, 1000n],
    [10000000n, 1000, 10000n],
    [250n, 100, 0n],
    [0n, 100, 0n],
    [1n, 100, 0n],
  ])('calculates hundredth pip amount from amount', (amount, hundredthPips, result) => {
    expect(getHundredthPipAmountFromAmount(amount, hundredthPips)).toBe(result);
  });
});
