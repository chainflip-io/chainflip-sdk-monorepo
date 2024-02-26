import { getAssetPrice } from '..';
import { checkPriceWarning } from '../checkPriceWarning';

jest.mock('../index.ts', () => ({
  getAssetPrice: jest.fn(),
}));

describe('checkPriceWarning', () => {
  it('returns false when threshold is below 10%', async () => {
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
      threshold: -10,
    });

    expect(result).toMatchObject({
      threshold: 10,
      warn: false,
    });
  });

  it('returns true when threshold is above 10%', async () => {
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
      threshold: -10,
    });

    expect(result).toMatchObject({
      threshold: 10,
      warn: true,
    });
  });
});
