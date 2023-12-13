import { calculateIncludedFees } from '@/swap/utils/fees';
import prisma from '../../client';

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(1000),
}));

describe('fees', () => {
  describe(calculateIncludedFees, () => {
    beforeAll(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
      await prisma.pool.createMany({
        data: [
          {
            baseAsset: 'FLIP',
            quoteAsset: 'USDC',
            liquidityFeeHundredthPips: 1000,
          },
          {
            baseAsset: 'ETH',
            quoteAsset: 'USDC',
            liquidityFeeHundredthPips: 1000,
          },
        ],
      });
    });

    it('returns fees for quote with intermediate amount', async () => {
      const fees = await calculateIncludedFees(
        'ETH',
        'FLIP',
        (100e18).toString(),
        (100e6).toString(),
        (100e18).toString(),
      );

      expect(fees).toMatchObject([
        {
          type: 'NETWORK',
          asset: 'USDC',
          amount: (0.1e6).toString(),
        },
        {
          type: 'LIQUIDITY',
          asset: 'ETH',
          amount: (0.1e18).toString(),
        },
        {
          type: 'LIQUIDITY',
          asset: 'USDC',
          amount: (0.1e6).toString(),
        },
      ]);
    });

    it('returns fees for quote from USDC', async () => {
      const fees = await calculateIncludedFees(
        'USDC',
        'FLIP',
        (100e6).toString(),
        undefined,
        (100e18).toString(),
      );

      expect(fees).toMatchObject([
        {
          type: 'NETWORK',
          asset: 'USDC',
          amount: (0.1e6).toString(),
        },
        {
          type: 'LIQUIDITY',
          asset: 'USDC',
          amount: (0.1e6).toString(),
        },
      ]);
    });

    it('returns fees for quote to USDC', async () => {
      const fees = await calculateIncludedFees(
        'ETH',
        'USDC',
        (100e18).toString(),
        undefined,
        (99.9e6).toString(),
      );

      expect(fees).toMatchObject([
        {
          type: 'NETWORK',
          asset: 'USDC',
          amount: (0.1e6).toString(),
        },
        {
          type: 'LIQUIDITY',
          asset: 'ETH',
          amount: (0.1e18).toString(),
        },
      ]);
    });
  });
});
