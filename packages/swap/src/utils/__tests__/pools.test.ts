import { describe, it, beforeAll, expect, vi } from 'vitest';
import prisma from '../../client.js';
import { getPools, getDeployedLiquidity, warmCaches } from '../pools.js';
import { getPoolDepth } from '../rpc.js';

vi.mock('../rpc.js', () => ({
  getPoolDepth: vi.fn().mockResolvedValue({
    baseLiquidityAmount: 1000n,
    quoteLiquidityAmount: 2000n,
  }),
  refreshEnvironmentCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lp.js', () => ({
  getJITLpAccounts: vi.fn().mockResolvedValue([]),
}));

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

describe(warmCaches, () => {
  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
    await prisma.pool.createMany({
      data: [
        { baseAsset: 'Eth', quoteAsset: 'Usdc', liquidityFeeHundredthPips: 2000 },
        { baseAsset: 'Btc', quoteAsset: 'Usdc', liquidityFeeHundredthPips: 2000 },
      ],
    });
  });

  it('pre-populates the cache so subsequent reads do not call getPoolDepth again', async () => {
    const getPoolDepthSpy = vi.mocked(getPoolDepth);
    getPoolDepthSpy.mockClear();

    await warmCaches();

    // one call per active pool asset
    expect(getPoolDepthSpy).toHaveBeenCalledTimes(2);

    getPoolDepthSpy.mockClear();

    // subsequent reads must hit the cache, not the RPC
    await getDeployedLiquidity('Eth', 'Usdc');
    await getDeployedLiquidity('Btc', 'Usdc');

    expect(getPoolDepthSpy).not.toHaveBeenCalled();
  });
});
