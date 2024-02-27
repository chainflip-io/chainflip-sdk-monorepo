import { getAssetPrice } from '..';
import env from '../../config/env';
import { checkPriceWarning } from '../checkPriceWarning';

jest.mock('../index.ts', () => ({
  getAssetPrice: jest.fn(),
}));

describe('checkPriceWarning', () => {
  it('returns false when threshold is below 5%', async () => {
    env.LIQUIDITY_WARNING_THRESHOLD = -5;

    const srcAsset = 'ETH';
    const destAsset = 'BTC';
    const srcAmount = BigInt(1e18); // 1 eth
    const destAmount = BigInt(0.06e8); // 0.06 btc

    jest
      .mocked(getAssetPrice)
      .mockResolvedValueOnce(3048) // eth price
      .mockResolvedValueOnce(51000); // btc price

    const result = await checkPriceWarning({
      srcAsset,
      destAsset,
      srcAmount,
      destAmount,
    });

    expect(result).toBeFalsy();
  });

  it('returns true when threshold is above 5%', async () => {
    env.LIQUIDITY_WARNING_THRESHOLD = -5;
    const srcAsset = 'ETH';
    const destAsset = 'BTC';
    const srcAmount = BigInt(1e18); // 1 eth
    const destAmount = BigInt(0.053e8); // 0.053 btc

    jest
      .mocked(getAssetPrice)
      .mockResolvedValueOnce(3048) // eth price
      .mockResolvedValueOnce(51000); // btc price

    const result = await checkPriceWarning({
      srcAsset,
      destAsset,
      srcAmount,
      destAmount,
    });

    expect(result).toBeTruthy();
  });
});
