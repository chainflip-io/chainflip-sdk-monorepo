import { describe, it, expect } from 'vitest';
import { transactionRef } from '../transactionRef.js';

const solanaSignature =
  'qRPnr195EppRTtmjiTUu94VDANaY2UtveuyBeyR5hMTjbqzDAtdNv8N4miayUNhkbQdgzn8TfYhEXHJ8xHjkHYp';

describe('transactionRef', () => {
  it.each([
    [`0x${'ab'.repeat(32)}`, ['Ethereum', 'Arbitrum']],
    [`0x${'AB'.repeat(32)}`, ['Ethereum', 'Arbitrum']],
    ['77a4dcda118d8cd4e537616effeac741ff60dbdb7af0b7f2f54a3a15c0556239', ['Bitcoin']],
    [solanaSignature, ['Solana']],
    ['104-2', ['Assethub']],
    ['4294967295-4294967295', ['Assethub']],
  ])('parses %s', (txRef, chains) => {
    expect(transactionRef.parse(txRef)).toEqual({ txRef, chains });
  });

  it.each([
    '',
    // wrong length evm hash
    '0xdeadbeef',
    `0x${'ab'.repeat(33)}`,
    // wrong length bitcoin tx id
    'deadbeef',
    'ab'.repeat(33),
    // base58 strings that are not 64 byte signatures
    'vmPY5qWJg6j8V6G',
    solanaSignature.slice(0, -1),
    `${solanaSignature}1`,
    'z'.repeat(88),
    // contains non-base58 characters
    `${solanaSignature.slice(0, -1)}0`,
    // out of u32 range
    '4294967296-1',
    '1-4294967296',
    'xur-test-0001',
    `0x${'ab'.repeat(32)}\n`,
    // long inputs must not reach the base58 decoder
    'z'.repeat(10_000),
    '0'.repeat(10_000),
  ])('rejects %j', (txRef) => {
    expect(transactionRef.safeParse(txRef).success).toBe(false);
  });
});
