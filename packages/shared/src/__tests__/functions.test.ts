import { ChainflipNetwork } from '../enums';
import { calculateBpsFromAmount } from '../functions';
import { bitcoinAddresses } from '../validation/__tests__/bitcoinAddresses';

describe(calculateBpsFromAmount, () => {
  it.each([
    [100n, 10000000n, 100000n],
    [100n, 250n, 2n],
    [100n, 0n, 0n],
    [100n, 1n, 0n],
  ])('calculates bps from amount', (bps, amount, result) => {
    expect(calculateBpsFromAmount(bps, amount)).toBe(result);
  });
});
