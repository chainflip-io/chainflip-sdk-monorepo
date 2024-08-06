import {
  getHundredthPipAmountFromAmount,
  getPipAmountFromAmount,
  getPriceFromPriceX128,
  getPriceX128FromPrice,
} from '../functions';

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

describe(getPriceX128FromPrice, () => {
  it.each([
    [2458.206, 'Eth', 'Usdc', '836484156059252456516448240236'] as const,
    ['2458.206', 'Eth', 'Usdc', '836484156059252456516448240236'] as const,
    ['600', 'Eth', 'Dot', '2041694201525630780780247644590609'] as const,
    [0, 'Eth', 'Usdc', '0'] as const,
  ])('calculates priceX128 from price', (price, srcAsset, destAsset, result) => {
    expect(getPriceX128FromPrice(price, srcAsset, destAsset)).toBe(result);
  });
});

describe(getPriceFromPriceX128, () => {
  it.each([
    [836484156059252456516448240236n, 'Eth', 'Usdc', '2458.206'] as const,
    ['836484156059252456516448240236', 'Eth', 'Usdc', '2458.206'] as const,
    [2041694201525630780780247644590609n, 'Eth', 'Dot', '600'] as const,
    [0n, 'Eth', 'Usdc', '0'] as const,
  ])('calculates price from priceX128', (priceX128, srcAsset, destAsset, result) => {
    expect(getPriceFromPriceX128(priceX128, srcAsset, destAsset)).toBe(result);
  });
});
