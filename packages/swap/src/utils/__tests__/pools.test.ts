import { describe, it, beforeAll, expect, vi } from 'vitest';
import prisma from '../../client';
import { getPools } from '../pools';

vi.mock('@/shared/consts', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getPoolsNetworkFeeHundredthPips: vi.fn().mockReturnValue(1000),
  };
});

describe('pools', () => {
  describe(getPools, () => {
    beforeAll(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
      await prisma.pool.createMany({
        data: [
          {
            baseAsset: 'Flip',
            quoteAsset: 'Usdc',
            liquidityFeeHundredthPips: 1000,
          },
          {
            baseAsset: 'Eth',
            quoteAsset: 'Usdc',
            liquidityFeeHundredthPips: 2000,
          },
        ],
      });
    });

    it('returns pools for quote with intermediate amount', async () => {
      const pools = await getPools('Flip', 'Eth');

      expect(pools).toHaveLength(2);
      expect(pools[0]).toMatchObject({
        baseAsset: 'Flip',
        quoteAsset: 'Usdc',
      });
      expect(pools[1]).toMatchObject({
        baseAsset: 'Eth',
        quoteAsset: 'Usdc',
      });
    });

    it('returns pools for quote from USDC', async () => {
      const pools = await getPools('Usdc', 'Eth');

      expect(pools).toHaveLength(1);
      expect(pools[0]).toMatchObject({
        baseAsset: 'Eth',
        quoteAsset: 'Usdc',
      });
    });

    it('returns pools for quote to USDC', async () => {
      const pools = await getPools('Flip', 'Usdc');

      expect(pools).toHaveLength(1);
      expect(pools[0]).toMatchObject({
        baseAsset: 'Flip',
        quoteAsset: 'Usdc',
      });
    });
  });
});
