import { afterEach, describe, it, beforeAll, expect, vi } from 'vitest';
import prisma from '../../client.js';
import env from '../../config/env.js';
import { getPools, getTotalLiquidity } from '../pools.js';
import { getPoolDepth } from '../rpc.js';

vi.mock('../rpc.js');
vi.mock('../lp.js', () => ({
  getLpAccounts: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/shared/consts.js', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getPoolsNetworkFeeHundredthPips: vi.fn().mockReturnValue(1000),
  };
});

const oldEnv = structuredClone(env);

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

describe(getTotalLiquidity, () => {
  afterEach(() => {
    Object.assign(env, oldEnv);
  });

  it('returns liquidity with the replenishment factor', async () => {
    vi.mocked(getPoolDepth).mockResolvedValueOnce({
      baseLiquidityAmount: BigInt(100e6),
      quoteLiquidityAmount: BigInt(100e6),
    });
    env.QUOTING_REPLENISHMENT_FACTOR.Usdt = [234n, 100n];

    expect(await getTotalLiquidity('Usdc', 'Usdt', true)).toEqual(BigInt(234e6));
    expect(await getTotalLiquidity('Usdt', 'Usdc', true)).toEqual(BigInt(100e6));
  });

  it('returns liquidity without the replenishment factor', async () => {
    vi.mocked(getPoolDepth).mockResolvedValueOnce({
      baseLiquidityAmount: BigInt(100e6),
      quoteLiquidityAmount: BigInt(100e6),
    });
    env.QUOTING_REPLENISHMENT_FACTOR.Usdt = [234n, 100n];

    expect(await getTotalLiquidity('Usdc', 'Usdt', false)).toEqual(BigInt(100e6));
    expect(await getTotalLiquidity('Usdt', 'Usdc', true)).toEqual(BigInt(100e6));
  });
});
