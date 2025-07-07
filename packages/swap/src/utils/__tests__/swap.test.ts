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
    ['Btc', 'Btc', { deposit: 600 + 2 * 600 + 6, swap: 12, egress: 600 + 90 }] as const,
    ['Btc', 'Eth', { deposit: 600 + 2 * 600 + 6, swap: 12, egress: 12 + 90 }] as const,
    ['Btc', 'Dot', { deposit: 600 + 2 * 600 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Eth', { deposit: 12 + 12 + 6, swap: 12, egress: 12 + 90 }] as const,
    ['Eth', 'Dot', { deposit: 12 + 12 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Btc', { deposit: 12 + 12 + 6, swap: 12, egress: 600 + 90 }] as const,
  ])(`estimates time for normal swap from %s to %s`, async (srcAsset, destAsset, expected) => {
    expect(await estimateSwapDuration({ srcAsset, destAsset })).toStrictEqual({
      durations: expected,
      total: expected.deposit + expected.swap + expected.egress,
    });
  });

  it.each([
    ['Btc', 'Btc', { deposit: 600 + 6, swap: 12, egress: 600 + 90 }] as const,
    ['Btc', 'Eth', { deposit: 600 + 6, swap: 12, egress: 12 + 90 }] as const,
    ['Btc', 'Dot', { deposit: 600 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Eth', { deposit: 12 + 6, swap: 12, egress: 12 + 90 }] as const,
    ['Eth', 'Dot', { deposit: 12 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Btc', { deposit: 12 + 6, swap: 12, egress: 600 + 90 }] as const,
  ])(`estimates time for boosted swap from %s to %s`, async (srcAsset, destAsset, expected) => {
    expect(await estimateSwapDuration({ srcAsset, destAsset, boosted: true })).toStrictEqual({
      durations: expected,
      total: expected.deposit + expected.swap + expected.egress,
    });
  });

  describe('uses the time of the last bitcoin block to estimate the bitcoin inclusion duration', async () => {
    it('returns default duration if no chain tracking is found', async () => {
      expect(
        await estimateSwapDuration({ srcAsset: 'Btc', destAsset: 'Eth', boosted: true }),
      ).toMatchObject({
        durations: { deposit: 600 + 6, swap: 12, egress: 12 + 90 },
      });
    });

    it.each([
      [0, 600, true],
      [60, 540, true],
      [300, 300, true],
      [540, 60, true],
      [600, 60, true], // always estimate at least 1 minute
      [800, 60, true], // always estimate at least 1 minute
      [320, 300, true], // round up to the nearest minute
      [350, 300, true], // round up to the nearest minute
    ])(
      `estimates time when last block is %s seconds old`,
      async (lastBlockAgeSeconds, inclusionTimeSeconds, isBoosted) => {
        await prisma.chainTracking.create({
          data: {
            chain: 'Bitcoin',
            height: 1n,
            eventWitnessedBlock: 1,
            blockTrackedAt: new Date(Date.now() - lastBlockAgeSeconds * 1000),
          },
        });

        expect(
          await estimateSwapDuration({ srcAsset: 'Btc', destAsset: 'Eth', boosted: isBoosted }),
        ).toMatchObject({
          durations: { deposit: inclusionTimeSeconds + 6, swap: 12, egress: 12 + 90 },
        });
      },
    );
  });

  it.each([
    ['Btc', 'Btc', 6, { deposit: 600 + 6 + 36, swap: 12, egress: 600 + 90 }] as const,
    ['Btc', 'Eth', 10, { deposit: 600 + 6 + 60, swap: 12, egress: 12 + 90 }] as const,
    ['Btc', 'Dot', 20, { deposit: 600 + 6 + 120, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Eth', 5, { deposit: 12 + 6 + 30, swap: 12, egress: 12 + 90 }] as const,
    ['Eth', 'Dot', 9, { deposit: 12 + 6 + 54, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'Btc', 15, { deposit: 12 + 6 + 90, swap: 12, egress: 600 + 90 }] as const,
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
