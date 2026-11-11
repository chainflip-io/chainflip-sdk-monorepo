import { describe, it, expect } from 'vitest';
import {
  assetAndChain,
  chainflipAddress,
  hexStringWithMaxByteSize,
  u128,
  u16,
  u32,
  unsignedInteger,
} from '../parsers.js';

describe('chainflipAddress', () => {
  it.each([
    'cFHyJEHEQ1YkT9xuFnxnPWVkihpYEGjBg4WbF6vCPtSPQoE8n',
    'cFJ4sqrg4FnrLPsGdt5w85XExGYxVLHLYLci28PnqcVVb8r8a',
  ])('valid chainflip address', async (address) => {
    expect(chainflipAddress.parse(address)).toBe(address);
  });
  it.each([
    '0x0',
    '14UPxPveENj36SF5YX8R2YMrb6HaS7Nuuxw5a1aysuxVZyDu',
    '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    // invalid ss58 strings make the decoder throw
    'cF',
    'cFxyz',
    'cF0OIl',
  ])('invalid chainflip address', async (address) => {
    expect(chainflipAddress.safeParse(address).success).toBe(false);
  });
});

describe('u128', () => {
  it('handles numbers', () => {
    expect(u128.parse(123)).toBe(123n);
  });

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

  it.each([1.5, -1, Infinity, NaN, Number.MAX_SAFE_INTEGER + 2])('rejects number %s', (n) => {
    expect(u128.safeParse(n).success).toBe(false);
  });

  it('rejects values that do not fit into 128 bits', () => {
    expect(u128.parse((2n ** 128n - 1n).toString())).toBe(2n ** 128n - 1n);
    expect(u128.safeParse((2n ** 128n).toString()).success).toBe(false);
    expect(u128.safeParse(`0x1${'0'.repeat(32)}`).success).toBe(false);
  });
});

describe('u16 and u32', () => {
  it('accepts integers in range', () => {
    expect(u16.parse(0)).toBe(0);
    expect(u16.parse(65535)).toBe(65535);
    expect(u32.parse(4294967295)).toBe(4294967295);
  });

  it.each([-1, 1.5, Infinity, NaN, 65536])('u16 rejects %s', (n) => {
    expect(u16.safeParse(n).success).toBe(false);
  });

  it.each([-1, 1.5, Infinity, NaN, 4294967296])('u32 rejects %s', (n) => {
    expect(u32.safeParse(n).success).toBe(false);
  });
});

describe('assetAndChain', () => {
  it('accepts valid asset and chain combinations', () => {
    expect(assetAndChain.parse({ asset: 'ETH', chain: 'Ethereum' })).toEqual({
      asset: 'ETH',
      chain: 'Ethereum',
    });
  });

  it.each([
    { asset: 'name', chain: 'constructor' },
    { asset: 'constructor', chain: '__proto__' },
    { asset: 'constructor', chain: 'Ethereum' },
    { asset: 'length', chain: '__defineGetter__' },
    { asset: 'BTC', chain: 'Ethereum' },
    { asset: 'DOT', chain: 'Polkadot' },
  ])('rejects $asset on $chain', (value) => {
    expect(assetAndChain.safeParse(value).success).toBe(false);
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

describe('hexStringWithMaxByteSize', () => {
  it('should accept hex string', () => {
    expect(hexStringWithMaxByteSize(100).parse('0x0123456789abcdef')).toEqual('0x0123456789abcdef');
  });

  it('should accept hex string with exactly max bytes', () => {
    expect(hexStringWithMaxByteSize(3).parse('0xabcdef')).toEqual('0xabcdef');
  });

  it('should reject non hex strings', () => {
    expect(() => hexStringWithMaxByteSize(100).parse('hello')).toThrow('Invalid input');
  });

  it('should reject strings larger than max byte size', () => {
    expect(() => hexStringWithMaxByteSize(2).parse('0xabcdef')).toThrow(
      'String must be less than or equal to 2 bytes',
    );
  });

  it('should accept hex string with different cases', () => {
    expect(hexStringWithMaxByteSize(100).parse('0xAbCdeF')).toEqual('0xAbCdeF');
  });
});
