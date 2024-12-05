import env from '@/swap/config/env';
import { calculateRecommendedSlippage } from '../autoSlippage';
import { getDeployedLiquidity, getUndeployedLiquidity } from '../pools';
import { getRequiredBlockConfirmations } from '../rpc';

jest.mock('../pools', () => ({
  getDeployedLiquidity: jest.fn(),
  getUndeployedLiquidity: jest.fn(),
}));

jest.mock('../rpc', () => ({
  getRequiredBlockConfirmations: jest.fn(),
}));

describe(calculateRecommendedSlippage, () => {
  beforeEach(() => {
    env.DCA_CHUNK_PRICE_IMPACT_PERCENT = {};
  });

  it('should return the correct value for ETH -> USDC for small amount', async () => {
    jest.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    jest.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    jest.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: -0.5
    // deployedLiquiditySlippage: 0

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 10n,
      dcaChunks: 1,
    });

    expect(result).toEqual(0.5);
  });

  it('should return the correct value for ETH -> USDC for dca chunks', async () => {
    jest.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    jest.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    jest.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);
    env.DCA_CHUNK_PRICE_IMPACT_PERCENT = { Eth: 0.2 };

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: -0.5
    // deployedLiquiditySlippage: 0
    // priceImpactAdjustment: 2

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 10n,
      dcaChunks: 11,
    });

    expect(result).toEqual(2.5);
  });

  it('should return the correct value for ETH -> USDC for amount >50% of deployed liquidity', async () => {
    jest.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    jest.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    jest.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.275

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 550n,
      dcaChunks: 1,
    });

    expect(result).toEqual(1.25);
  });

  it('should return the correct value for ETH -> USDC for amount > undeployed liquidity and deployed liquidity', async () => {
    jest.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    jest.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    jest.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.65

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 1300n,
      dcaChunks: 1,
    });

    expect(result).toEqual(1.75);
  });

  it('should return the correct value for ETH -> USDC for amount > undeployed liquidity but less than deployed liquidity', async () => {
    jest.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    jest.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    jest.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.4

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 800n,
      dcaChunks: 1,
    });

    expect(result).toEqual(1.5); // 1.48 rounded
  });

  it('should return the correct value for BTC -> ETH when swapping 5 BTC with 6 BTC deployed and 2 BTC undeployed', async () => {
    jest.mocked(getUndeployedLiquidity).mockResolvedValueOnce(120_000n).mockResolvedValueOnce(75n);
    jest.mocked(getDeployedLiquidity).mockResolvedValueOnce(500_000n).mockResolvedValueOnce(120n);
    jest.mocked(getRequiredBlockConfirmations).mockResolvedValue(3);

    // Leg1
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.3

    // Leg2
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.4166666666666667

    // baseSlippage: 1
    // depositTimeSlippage: Max(600s * 3 / 60 * 0.05, 1) = 1
    // maxLiquiditySlippage: 0.4166666666666667
    // Final: 2.4166666666666667

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Btc',
      destAsset: 'Eth',
      intermediateAmount: 3000n,
      egressAmount: 1n,
      dcaChunks: 100,
    });

    expect(result).toEqual(2.5);
  });

  it('should return the correct value for BTC -> ETH when swapping 5 BTC with 6 BTC deployed and 2 BTC undeployed and BOOSTED', async () => {
    jest.mocked(getUndeployedLiquidity).mockResolvedValueOnce(120_000n).mockResolvedValueOnce(40n);
    jest.mocked(getDeployedLiquidity).mockResolvedValueOnce(360_000n).mockResolvedValueOnce(200n);
    jest.mocked(getRequiredBlockConfirmations).mockResolvedValue(3);

    // Leg1
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.4166666666666667

    // Leg2
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0

    // baseSlippage: 1
    // depositTimeSlippage: 600s * 1 / 60 * 0.05 = 0.5
    // maxLiquiditySlippage: 0.4166666666666667
    // Final: 1.9166666667

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Btc',
      destAsset: 'Eth',
      intermediateAmount: 3000n,
      egressAmount: 1n,
      dcaChunks: 100,
      boostFeeBps: 10,
    });

    expect(result).toEqual(2);
  });

  it('should return the correct value for swaps between stable assets', async () => {
    expect(
      await calculateRecommendedSlippage({
        srcAsset: 'Usdc',
        destAsset: 'Usdt',
        egressAmount: 10n,
        dcaChunks: 11,
      }),
    ).toEqual(0.5);

    expect(
      await calculateRecommendedSlippage({
        srcAsset: 'Usdt',
        destAsset: 'Usdc',
        egressAmount: 10n,
        dcaChunks: 11,
      }),
    ).toEqual(0.5);

    expect(
      await calculateRecommendedSlippage({
        srcAsset: 'ArbUsdc',
        destAsset: 'SolUsdc',
        egressAmount: 10n,
        dcaChunks: 11,
      }),
    ).toEqual(0.5);
  });
});
