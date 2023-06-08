import { btcAddress, dotAddress, u128, unsignedInteger } from '../parsers';

describe('btc parser', () => {
  it.each([
    'bc1qxy2kgdygjrsqtzq2n0yrf249',
    '1GX28yLjVWux7ws4UQ9FB4MnLH4UKTPK2z',
    'bcrt1pj5pjkur59zl9yg3q5d33dxvgndw6967hf5zmt2er9xec6wya754s8vjtd9',
    'bc1qc7slrfxkknqcq2jevvvkdgvrt8080852dfjewde450xdlk4ugp7szw5tk9',
    'tb1',
    'bcrt1',
    'm',
  ])(`validates btc address %s to be true`, (address) => {
    expect(btcAddress.safeParse(address).success).toBeTruthy();
  });

  it.each([
    'br1qxy2kgdygjrsqtzq2n0yrf249',
    '',
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    '5F3sa2TJAWMqDhXG6jhV4N8ko9SxwGy8TpaNS1repo5EYjQX',
  ])(`validates btc address %s to be false`, (address) => {
    expect(btcAddress.safeParse(address).success).toBeFalsy();
  });
});

describe('dotAddress', () => {
  it('validates dot address and transforms a dot address', async () => {
    expect(dotAddress.parse('0x0')).toBe('F7Hs');
    expect(
      dotAddress.parse(
        '0x9999999999999999999999999999999999999999999999999999999999999999',
      ),
    ).toBe('5FY6p4faNbTZeuEZat5QtPXhjUHvjopmqUCbQibdKpvyPbww');
  });
});

describe('u128', () => {
  it('handles numeric strings', () => {
    expect(u128.parse('123')).toBe(123n);
  });

  it('handles hex strings', () => {
    expect(u128.parse('0x123')).toBe(291n);
  });

  it('rejects invalid hex string', () => {
    expect(() => u128.parse('0x123z')).toThrow();
    expect(() => u128.parse('0x')).toThrow();
  });
});

describe('unsignedInteger', () => {
  it('handles numeric strings', () => {
    expect(unsignedInteger.parse('123')).toBe(123n);
  });

  it('handles hex strings', () => {
    expect(unsignedInteger.parse('0x123')).toBe(291n);
  });

  it('handles numbers', () => {
    expect(unsignedInteger.parse(123)).toBe(123n);
  });

  it('rejects invalid hex string', () => {
    expect(() => u128.parse('0x123z')).toThrow();
    expect(() => u128.parse('0x')).toThrow();
  });
});
