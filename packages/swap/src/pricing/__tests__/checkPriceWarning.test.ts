import { vi, describe, expect, it } from 'vitest';
import env from '../../config/env.js';
import { checkPriceWarning } from '../checkPriceWarning.js';
import { getAssetPrice } from '../index.js';

vi.mock('../index.ts', () => ({
  getAssetPrice: vi.fn(),
}));

describe('checkPriceWarning', () => {
  it('returns false when threshold is below 5%', async () => {
    env.LIQUIDITY_WARNING_THRESHOLD = -5;

    const srcAsset = 'Eth';
    const destAsset = 'Btc';
    const srcAmount = BigInt(1e18); // 1 eth
    const destAmount = BigInt(0.06e8); // 0.06 btc

    vi.mocked(getAssetPrice)
      .mockResolvedValueOnce(3048) // eth price
      .mockResolvedValueOnce(51000); // btc price

    const lowLiquidityWarning = await checkPriceWarning({
      srcAsset,
      destAsset,
      srcAmount,
      destAmount,
    });

    expect(lowLiquidityWarning).toBe(false);
  });

  it('returns true when threshold is above 5%', async () => {
    env.LIQUIDITY_WARNING_THRESHOLD = -5;
    const srcAsset = 'Eth';
    const destAsset = 'Btc';
    const srcAmount = BigInt(1e18); // 1 eth
    const destAmount = BigInt(0.053e8); // 0.053 btc

    vi.mocked(getAssetPrice)
      .mockResolvedValueOnce(3048) // eth price
      .mockResolvedValueOnce(51000); // btc price

    const lowLiquidityWarning = await checkPriceWarning({
      srcAsset,
      destAsset,
      srcAmount,
      destAmount,
    });

    expect(lowLiquidityWarning).toBe(true);
  });
});
