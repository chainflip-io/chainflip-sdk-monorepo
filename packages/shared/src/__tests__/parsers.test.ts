import { describe, it, expect } from 'vitest';
import { chainflipAddress, hexStringWithMaxByteSize, u128, unsignedInteger } from '../parsers';

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
