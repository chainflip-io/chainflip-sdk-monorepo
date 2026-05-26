import { describe, it, beforeEach, expect, vi } from 'vitest';
import { boostPoolsCache, supplyPoolsCache, getBoostFeeBpsForAmount } from '../boost.js';
import * as rpc from '../rpc.js';

vi.mock('../rpc.js');

const boostPool = (tier: number, availableAmount: bigint) =>
  ({ asset: 'Btc', tier, availableAmount }) as any;

const supplyPool = (
  availableAmount: bigint,
  utilisationCap?: number | null,
  totalAmount?: bigint,
) =>
  ({
    ...(utilisationCap !== undefined && { utilisationCap }),
    asset: { chain: 'Bitcoin', asset: 'BTC' },
    availableAmount,
    totalAmount: totalAmount ?? availableAmount,
    utilisationRate: 0,
    currentInterestRate: 100,
    originationFee: 10,
    liquidationFee: 5,
    interestRateCurve: {
      interestAtZeroUtilisation: 50,
      junctionUtilisation: 80,
      interestAtJunctionUtilisation: 75,
      interestAtMaxUtilisation: 200,
    },
  }) as any;

describe(getBoostFeeBpsForAmount, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line dot-notation
    boostPoolsCache['store'].clear();
    // eslint-disable-next-line dot-notation
    supplyPoolsCache['store'].clear();
  });

  it('returns undefined estimatedBoostFeeBps and 0 maxBoostFeeBps for non-BTC asset', async () => {
    expect(await getBoostFeeBpsForAmount({ amount: BigInt(1e8), asset: 'Eth' })).toStrictEqual({
      estimatedBoostFeeBps: undefined,
      maxBoostFeeBps: 0,
    });
  });

  // TODO(2.2): Remove after all networks are upgraded
  describe('pre-runtime 20200: 5, 15, 30 bps boost pools (no supply pools)', () => {
    beforeEach(() => {
      vi.mocked(rpc.cachedGetRuntimeVersion).mockResolvedValue({ specVersion: 20199 } as any);
      vi.mocked(rpc.getBoostPoolsDepth).mockResolvedValue([
        boostPool(5, BigInt(1e8)),
        boostPool(15, BigInt(0.5e8)),
        boostPool(30, 0n),
      ]);
    });

    it('does not call getSupplyPoolsDepth', async () => {
      await getBoostFeeBpsForAmount({ amount: BigInt(0.5e8), asset: 'Btc' });

      expect(rpc.getSupplyPoolsDepth).not.toHaveBeenCalled();
    });

    it('serves amount from cheapest (5 bps) pool', async () => {
      expect(await getBoostFeeBpsForAmount({ amount: BigInt(0.5e8), asset: 'Btc' })).toStrictEqual({
        estimatedBoostFeeBps: 5,
        maxBoostFeeBps: 30,
      });
    });

    it('splits across 5 and 15 bps pools when 5 bps pool is insufficient', async () => {
      // 1e8 from 5-bps pool, 0.5e8 from 15-bps pool → weighted average ≈ 8 bps
      expect(await getBoostFeeBpsForAmount({ amount: BigInt(1.5e8), asset: 'Btc' })).toStrictEqual({
        estimatedBoostFeeBps: 8,
        maxBoostFeeBps: 30,
      });
    });

    it('returns undefined estimatedBoostFeeBps when boost pool liquidity is insufficient', async () => {
      // Only 1.5e8 available across all boost pools, requesting 2e8
      expect(await getBoostFeeBpsForAmount({ amount: BigInt(2e8), asset: 'Btc' })).toStrictEqual({
        estimatedBoostFeeBps: undefined,
        maxBoostFeeBps: 30,
      });
    });
  });

  describe('post-runtime 20200: 5 bps boost pool + 5 bps supply pool', () => {
    beforeEach(() => {
      vi.mocked(rpc.cachedGetRuntimeVersion).mockResolvedValue({ specVersion: 20200 } as any);
      vi.mocked(rpc.getBoostPoolsDepth).mockResolvedValue([boostPool(5, BigInt(1e8))]);
      vi.mocked(rpc.getSupplyPoolsDepth).mockResolvedValue([supplyPool(BigInt(1e8))]);
    });

    it('serves amount from the boost pool alone when it has sufficient liquidity', async () => {
      expect(await getBoostFeeBpsForAmount({ amount: BigInt(0.5e8), asset: 'Btc' })).toStrictEqual({
        estimatedBoostFeeBps: 5,
        maxBoostFeeBps: 5,
      });
    });

    it('splits between boost and supply pool, both at 5 bps', async () => {
      // 1e8 from 5-bps boost pool, 0.5e8 from 5-bps supply pool → still 5 bps flat
      expect(await getBoostFeeBpsForAmount({ amount: BigInt(1.5e8), asset: 'Btc' })).toStrictEqual({
        estimatedBoostFeeBps: 5,
        maxBoostFeeBps: 5,
      });
    });

    it('returns undefined estimatedBoostFeeBps when total liquidity is insufficient', async () => {
      // Only 2e8 available in total (1e8 boost + 1e8 supply), requesting 2.5e8
      expect(await getBoostFeeBpsForAmount({ amount: BigInt(2.5e8), asset: 'Btc' })).toStrictEqual({
        estimatedBoostFeeBps: undefined,
        maxBoostFeeBps: 5,
      });
    });

    describe('utilisationCap on supply pool', () => {
      it('null utilisationCap uses totalAvailableAmount as the usable amount', async () => {
        // Boost: 0.5e8, Supply: total=2e8, available=1e8, null cap
        // borrowed=1e8, effective limit=2e8 (100%), usable = 2e8 - 1e8 = 1e8
        vi.mocked(rpc.getBoostPoolsDepth).mockResolvedValue([boostPool(5, BigInt(0.5e8))]);
        vi.mocked(rpc.getSupplyPoolsDepth).mockResolvedValue([
          supplyPool(BigInt(1e8), null, BigInt(2e8)),
        ]);

        // 0.5e8 from boost + 1e8 from supply → covers 1.5e8 at 5 bps flat
        expect(
          await getBoostFeeBpsForAmount({ amount: BigInt(1.5e8), asset: 'Btc' }),
        ).toStrictEqual({ estimatedBoostFeeBps: 5, maxBoostFeeBps: 5 });
      });

      it('allows borrowing remaining cap capacity when cap is partially exhausted', async () => {
        // Boost: 0.5e8, Supply: total=2e8, available=1.5e8, 75% cap
        // borrowed=0.5e8, effective limit=1.5e8, usable = 1.5e8 - 0.5e8 = 1e8
        vi.mocked(rpc.getBoostPoolsDepth).mockResolvedValue([boostPool(5, BigInt(0.5e8))]);
        vi.mocked(rpc.getSupplyPoolsDepth).mockResolvedValue([
          supplyPool(BigInt(1.5e8), 750_000, BigInt(2e8)),
        ]);

        // 0.5e8 from boost + 1e8 from supply (remaining cap) → covers 1.5e8 at 5 bps flat
        expect(
          await getBoostFeeBpsForAmount({ amount: BigInt(1.5e8), asset: 'Btc' }),
        ).toStrictEqual({ estimatedBoostFeeBps: 5, maxBoostFeeBps: 5 });
      });

      it('prevents further borrowing when utilisationCap is fully exhausted', async () => {
        // Boost: 0.5e8, Supply: total=2e8, available=0.5e8, 75% cap
        // borrowed=1.5e8, effective limit=1.5e8, usable = 1.5e8 - 1.5e8 = 0
        vi.mocked(rpc.getBoostPoolsDepth).mockResolvedValue([boostPool(5, BigInt(0.5e8))]);
        vi.mocked(rpc.getSupplyPoolsDepth).mockResolvedValue([
          supplyPool(BigInt(0.5e8), 750_000, BigInt(2e8)),
        ]);

        // 0.5e8 from boost + 0 from supply (cap exhausted) = 0.5e8 < 1.5e8 → undefined
        expect(
          await getBoostFeeBpsForAmount({ amount: BigInt(1.5e8), asset: 'Btc' }),
        ).toStrictEqual({ estimatedBoostFeeBps: undefined, maxBoostFeeBps: 5 });
      });
    });
  });
});
