import { swapRate } from '@/shared/tests/fixtures';
import { calculateIncludedSwapFees } from '@/swap/utils/fees';
import prisma from '../../client';

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(1000),
}));

jest.mock('axios', () => ({
  post: jest.fn((url, data) => {
    if (data.method === 'cf_swap_rate') {
      return Promise.resolve({
        data: swapRate({
          output: `0x${(BigInt(data.params[2]) * 2n).toString(16)}`,
        }),
      });
    }

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  }),
}));

describe(calculateIncludedSwapFees, () => {
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
          liquidityFeeHundredthPips: 1000,
        },
      ],
    });
  });

  it('returns fees for quote with intermediate amount', async () => {
    const fees = await calculateIncludedSwapFees(
      'Eth',
      'Flip',
      BigInt(100e18),
      BigInt(100e6),
      BigInt(100e18),
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
    const fees = await calculateIncludedSwapFees(
      'Usdc',
      'Flip',
      BigInt(100e6),
      undefined,
      BigInt(100e18),
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
    const fees = await calculateIncludedSwapFees(
      'Eth',
      'Usdc',
      BigInt(100e18),
      undefined,
      BigInt(99.9e6),
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

  it('returns fees for USDC to USDC special case', async () => {
    const fees = await calculateIncludedSwapFees(
      'Usdc',
      'Usdc',
      BigInt(100e6),
      undefined,
      BigInt(100e6),
    );

    expect(fees).toMatchObject([
      {
        type: 'NETWORK',
        asset: 'USDC',
        amount: (0.1e6).toString(),
      },
    ]);
  });
});
