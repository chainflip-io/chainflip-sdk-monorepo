import { ChainflipAsset } from '@chainflip/utils/chainflip';
import { describe, expect, it } from 'vitest';
import { isStableCoin } from '../guards.js';

describe(isStableCoin, () => {
  it.each([
    ['ArbEth', false],
    ['ArbUsdc', true],
    ['Btc', false],
    ['Eth', false],
    ['Flip', false],
    ['HubDot', false],
    ['HubUsdc', true],
    ['HubUsdt', true],
    ['Sol', false],
    ['SolUsdc', true],
    ['Usdc', true],
    ['Usdt', true],
  ] as [ChainflipAsset, boolean][])('handles %s', (asset, expected) => {
    expect(isStableCoin(asset)).toBe(expected);
  });
});
