import { getAssetPrice } from '..';
import { checkLiquidityWarning } from '../liquidityWarning';

jest.mock('../index.ts', () => ({
  getAssetPrice: jest.fn(),
}));

describe('checkLiquidityWarning', () => {
  it('does not give low liquidity warning when price impact is <10%', async () => {
    const srcAsset = 'ETH';
    const destAsset = 'BTC';
    const srcAmount = BigInt(1e18); // 1 eth
    const destAmount = BigInt(0.06e8); // 0.06 btc

    jest
      .mocked(getAssetPrice)
      .mockResolvedValueOnce(3048) // eth price
      .mockResolvedValueOnce(51000); // btc price

    const result = await checkLiquidityWarning({
      srcAsset,
      destAsset,
      srcAmount,
      destAmount,
    });

    expect(result).toBe(false);
  });

  it('gives low liquidity warning when price impact is >10%', async () => {
    const srcAsset = 'ETH';
    const destAsset = 'BTC';
    const srcAmount = BigInt(1e18); // 1 eth
    const destAmount = BigInt(0.053e8); // 0.053 btc

    jest
      .mocked(getAssetPrice)
      .mockResolvedValueOnce(3048) // eth price
      .mockResolvedValueOnce(51000); // btc price

    const result = await checkLiquidityWarning({
      srcAsset,
      destAsset,
      srcAmount,
      destAmount,
    });

    expect(result).toBe(true);
  });
});
