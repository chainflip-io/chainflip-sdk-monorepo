import { assetConstants } from '@chainflip/utils/chainflip';
import { beforeEach, describe, it, expect, beforeAll } from 'vitest';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import prisma from '../../client.js';
import { boostChainflipBlocksDelayCache } from '../boost.js';
import { estimateSwapDuration } from '../swap.js';

describe(estimateSwapDuration, () => {
  beforeAll(() => {
    mockRpcResponse((url, data) => {
      if (data.method === 'cf_environment') {
        return Promise.resolve({
          data: environment(),
        });
      }

      throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking", "BoostDelayChainflipBlocks" CASCADE`;
    // eslint-disable-next-line dot-notation
    boostChainflipBlocksDelayCache['store'].clear();
  });

  it.each([
    ['Btc', 'Btc', { deposit: 300 + 2 * 600 + 6, swap: 12, egress: 300 + 90 }] as const,
    ['Btc', 'Eth', { deposit: 300 + 2 * 600 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Btc', 'Dot', { deposit: 300 + 2 * 600 + 6, swap: 12, egress: 3 + 90 }] as const,
    ['Eth', 'Eth', { deposit: 6 + 12 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Dot', { deposit: 6 + 12 + 6, swap: 12, egress: 3 + 90 }] as const,
    ['Eth', 'Btc', { deposit: 6 + 12 + 6, swap: 12, egress: 300 + 90 }] as const,
  ])(`estimates time for normal swap from %s to %s`, async (srcAsset, destAsset, expected) => {
    expect(await estimateSwapDuration({ srcAsset, destAsset })).toStrictEqual({
      durations: expected,
      total: expected.deposit + expected.swap + expected.egress,
    });
  });

  it.each([
    ['Btc', 'Btc', { deposit: 300 + 6, swap: 12, egress: 300 + 90 }] as const,
    ['Btc', 'Eth', { deposit: 300 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Btc', 'Dot', { deposit: 300 + 6, swap: 12, egress: 3 + 90 }] as const,
    ['Eth', 'Eth', { deposit: 6 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Dot', { deposit: 6 + 6, swap: 12, egress: 3 + 90 }] as const,
    ['Eth', 'Btc', { deposit: 6 + 6, swap: 12, egress: 300 + 90 }] as const,
  ])(`estimates time for boosted swap from %s to %s`, async (srcAsset, destAsset, expected) => {
    expect(await estimateSwapDuration({ srcAsset, destAsset, boosted: true })).toStrictEqual({
      durations: expected,
      total: expected.deposit + expected.swap + expected.egress,
    });
  });

  it.each([
    ['Btc', 'Btc', 6, { deposit: 300 + 6 + 36, swap: 12, egress: 300 + 90 }] as const,
    ['Btc', 'Eth', 10, { deposit: 300 + 6 + 60, swap: 12, egress: 6 + 90 }] as const,
    ['Btc', 'Dot', 20, { deposit: 300 + 6 + 120, swap: 12, egress: 3 + 90 }] as const,
    ['Eth', 'Eth', 5, { deposit: 6 + 6 + 30, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Dot', 9, { deposit: 6 + 6 + 54, swap: 12, egress: 3 + 90 }] as const,
    ['Eth', 'Btc', 15, { deposit: 6 + 6 + 90, swap: 12, egress: 300 + 90 }] as const,
  ])(
    `estimates time for boosted swap from %s to %s when boost delay has been set`,
    async (srcAsset, destAsset, numBlocks, expected) => {
      const { chain } = assetConstants[srcAsset];
      await prisma.boostDelayChainflipBlocks.upsert({
        where: { chain },
        create: { chain, numBlocks },
        update: { numBlocks },
      });

      expect(await estimateSwapDuration({ srcAsset, destAsset, boosted: true })).toStrictEqual({
        durations: expected,
        total: expected.deposit + expected.swap + expected.egress,
      });
    },
  );
});
