import BigNumber from 'bignumber.js';
import { describe, it, beforeEach, expect, vi } from 'vitest';
import env from '@/swap/config/env';
import { calculateRecommendedSlippage } from '../autoSlippage';
import { getDeployedLiquidity, getUndeployedLiquidity } from '../pools';
import { getRequiredBlockConfirmations } from '../rpc';

vi.mock('../pools', () => ({
  getDeployedLiquidity: vi.fn(),
  getUndeployedLiquidity: vi.fn(),
}));

vi.mock('../rpc', () => ({
  getRequiredBlockConfirmations: vi.fn(),
}));

describe(calculateRecommendedSlippage, () => {
  beforeEach(() => {
    env.DCA_CHUNK_PRICE_IMPACT_PERCENT = {};
    env.STABLE_COIN_SLIPPAGE_MIN_PRICE = 0.995;
  });

  it('should return the correct value for ETH -> USDC for small amount', async () => {
    vi.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    vi.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    vi.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: -0.5
    // deployedLiquiditySlippage: 0

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 10n,
      dcaChunks: 1,
      estimatedPrice: new BigNumber(10),
    });

    expect(result).toEqual(0.5);
  });

  it('should return the correct value for ETH -> USDC for dca chunks', async () => {
    vi.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    vi.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    vi.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);
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
      estimatedPrice: new BigNumber(10),
    });

    expect(result).toEqual(2.5);
  });

  it('should return the correct value for ETH -> USDC for amount >50% of deployed liquidity', async () => {
    vi.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    vi.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    vi.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.275

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 550n,
      dcaChunks: 1,
      estimatedPrice: new BigNumber(550),
    });

    expect(result).toEqual(1.25);
  });

  it('should return the correct value for ETH -> USDC for amount > undeployed liquidity and deployed liquidity', async () => {
    vi.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    vi.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    vi.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.65

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 1300n,
      dcaChunks: 1,
      estimatedPrice: new BigNumber(1300),
    });

    expect(result).toEqual(1.75);
  });

  it('should return the correct value for ETH -> USDC for amount > undeployed liquidity but less than deployed liquidity', async () => {
    vi.mocked(getUndeployedLiquidity).mockResolvedValue(500n);
    vi.mocked(getDeployedLiquidity).mockResolvedValue(1000n);
    vi.mocked(getRequiredBlockConfirmations).mockResolvedValue(8);

    // baseSlippage: 1
    // depositTimeSlippage: 12s * 8 / 60 * 0.05 = 0.08
    // undeployedLiquiditySlippage: 0
    // deployedLiquiditySlippage: 0.4

    const result = await calculateRecommendedSlippage({
      srcAsset: 'Eth',
      destAsset: 'Usdc',
      egressAmount: 800n,
      dcaChunks: 1,
      estimatedPrice: new BigNumber(800),
    });

    expect(result).toEqual(1.5); // 1.48 rounded
  });

  it('should return the correct value for BTC -> ETH when swapping 5 BTC with 6 BTC deployed and 2 BTC undeployed', async () => {
    vi.mocked(getUndeployedLiquidity).mockResolvedValueOnce(120_000n).mockResolvedValueOnce(75n);
    vi.mocked(getDeployedLiquidity).mockResolvedValueOnce(500_000n).mockResolvedValueOnce(120n);
    vi.mocked(getRequiredBlockConfirmations).mockResolvedValue(3);

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
      estimatedPrice: new BigNumber(3000),
    });

    expect(result).toEqual(2.5);
  });

  it('should return the correct value for BTC -> ETH when swapping 5 BTC with 6 BTC deployed and 2 BTC undeployed and BOOSTED', async () => {
    vi.mocked(getUndeployedLiquidity).mockResolvedValueOnce(120_000n).mockResolvedValueOnce(40n);
    vi.mocked(getDeployedLiquidity).mockResolvedValueOnce(360_000n).mockResolvedValueOnce(200n);
    vi.mocked(getRequiredBlockConfirmations).mockResolvedValue(3);

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
      estimatedPrice: new BigNumber(3000),
    });

    expect(result).toEqual(2);
  });

  describe.each([
    ['Usdt', 'Usdc'],
    ['ArbUsdc', 'SolUsdc'],
  ] as const)('between %s and %s', (srcAsset, destAsset) => {
    it.each([
      [new BigNumber('1.0018176621030249'), 0.68, 0.995],
      [new BigNumber('1.0333685749993480'), 3.71, 0.995],
      [new BigNumber('1'), 0.5, 0.995],
      // if it's less than the targeted rate
      [new BigNumber('0.97445870289259320468'), 0.5, 0.97],
    ])(
      'should return the correct value for swaps between stable assets',
      async (estimatedPrice, recommendedSlippage, expected) => {
        const rate = await calculateRecommendedSlippage({
          srcAsset,
          destAsset,
          egressAmount: 10n,
          dcaChunks: 11,
          estimatedPrice,
        });
        expect(rate).toEqual(recommendedSlippage);
        expect(estimatedPrice.times(1 - rate / 100).toNumber()).toBeCloseTo(expected, 3);
      },
    );
  });

  it('is configurable for stable coin slippage', async () => {
    env.STABLE_COIN_SLIPPAGE_MIN_PRICE = 0.99;
    const estimatedPrice = new BigNumber(1);
    const rate = await calculateRecommendedSlippage({
      srcAsset: 'Usdc',
      destAsset: 'Usdt',
      egressAmount: 10n,
      dcaChunks: 11,
      estimatedPrice,
    });
    expect(rate).toEqual(1);
    expect(estimatedPrice.times(1 - rate / 100).toNumber()).toBeCloseTo(0.99, 3);
  });
});
