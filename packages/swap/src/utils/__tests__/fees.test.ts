import { environment, swapRate } from '@/shared/tests/fixtures';
import { calculateIncludedSwapFees, tryExtractFeesFromIngressAmount } from '@/swap/utils/fees';
import prisma from '../../client';

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(1000),
}));

const INGRESS_FEE = 10;
jest.mock('axios', () => ({
  post: jest.fn((url, data) => {
    if (data.method === 'cf_swap_rate') {
      return Promise.resolve({
        data: swapRate({
          output: `0x${(BigInt(data.params[2]) * 2n).toString(16)}`,
        }),
      });
    }
    if (data.method === 'cf_environment') {
      return Promise.resolve({
        data: environment({
          ingressFee: `0x${BigInt(INGRESS_FEE).toString(16)}`,
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

  it('handles zero intermediate amounts', async () => {
    const fees = await calculateIncludedSwapFees('Eth', 'Flip', BigInt(100e18), 0n, 0n);

    expect(fees).toMatchObject([
      {
        type: 'NETWORK',
        asset: 'USDC',
        amount: '0',
      },
      {
        type: 'LIQUIDITY',
        asset: 'ETH',
        amount: (0.1e18).toString(),
      },
      {
        type: 'LIQUIDITY',
        asset: 'USDC',
        amount: '0',
      },
    ]);
  });
});

describe(tryExtractFeesFromIngressAmount, () => {
  it('extracts the fees from the ingress amount and derives the swap input amount', async () => {
    const { fees, amountAfterFees } = await tryExtractFeesFromIngressAmount({
      srcAsset: 'Btc',
      ingressAmount: BigInt(100e8),
      brokerCommissionBps: 10,
    });

    expect(fees).toMatchObject([
      {
        type: 'INGRESS',
        asset: 'BTC',
        amount: INGRESS_FEE.toString(),
      },
      {
        type: 'BROKER',
        asset: 'BTC',
        amount: '9999999',
      },
    ]);

    expect(amountAfterFees.toString()).toBe('9989999991');
  });
  it("doesn't include broker fee when not provided with one", async () => {
    const { fees, amountAfterFees } = await tryExtractFeesFromIngressAmount({
      srcAsset: 'Btc',
      ingressAmount: BigInt(100e8),
    });

    expect(fees).toMatchObject([
      {
        type: 'INGRESS',
        asset: 'BTC',
        amount: INGRESS_FEE.toString(),
      },
    ]);

    expect(amountAfterFees).toBe(BigInt(100e8) - BigInt(INGRESS_FEE));
  });
});
