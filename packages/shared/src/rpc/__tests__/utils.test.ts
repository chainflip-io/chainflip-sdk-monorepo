import { describe, it, expect } from 'vitest';
import { validateSwapAmount } from '../utils.js';

const env = {
  swapping: {
    maximumSwapAmounts: { Ethereum: { ETH: 1000000000000000000n, FLIP: null } },
  },
  ingressEgress: {
    minimumDepositAmounts: { Ethereum: { ETH: 100000000000000000n, FLIP: 0n } },
  },
} as any;

describe(validateSwapAmount, () => {
  it('fails if the amount is too small', () => {
    const result = validateSwapAmount(env, 'Eth', 100n);

    expect(result).toEqual({
      success: false,
      reason: 'expected amount is below minimum swap amount (100000000000000000)',
    });
  });

  it('fails if the amount is too large', () => {
    const result = validateSwapAmount(env, 'Eth', 1000000000000000001n);

    expect(result).toEqual({
      success: false,
      reason: 'expected amount is above maximum swap amount (1000000000000000000)',
    });
  });

  it('succeeds if the amount is within range', () => {
    expect(validateSwapAmount(env, 'Eth', 100000000000000000n)).toEqual({ success: true });
    expect(validateSwapAmount(env, 'Flip', 2n ** 128n - 1n)).toEqual({ success: true });
  });

  it('fails when it exceeds u128::MAX', () => {
    const result = validateSwapAmount(env, 'Flip', 2n ** 128n);

    expect(result).toEqual({
      success: false,
      reason:
        'expected amount is above maximum swap amount (340282366920938463463374607431768211455)',
    });
  });
});
