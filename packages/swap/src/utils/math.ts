import BigNumber from 'bignumber.js';

export const percentDiff = (expected: BigNumber.Value, actual: BigNumber.Value) => {
  const a = new BigNumber(expected);
  const b = new BigNumber(actual);

  // |a - b| / ((a + b) / 2) * 100
  return a.minus(b).abs().div(a.plus(b).div(2)).times(100);
};
