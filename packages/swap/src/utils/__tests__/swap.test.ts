import { assetConstants } from '@chainflip/utils/chainflip';
import { beforeEach, describe, it, expect, beforeAll } from 'vitest';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures.js';
import prisma from '../../client.js';
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
    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking" CASCADE`;
  });

  it.each([
    ['Btc', 'Btc', { deposit: 300 + 2 * 600 + 6, swap: 12, egress: 300 + 90 }] as const,
    ['Btc', 'Eth', { deposit: 300 + 2 * 600 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Btc', 'HubDot', { deposit: 300 + 2 * 600 + 6, swap: 12, egress: 1.5 + 90 }] as const,
    ['Eth', 'Eth', { deposit: 6 + 12 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'HubDot', { deposit: 6 + 12 + 6, swap: 12, egress: 1.5 + 90 }] as const,
    ['Eth', 'Btc', { deposit: 6 + 12 + 6, swap: 12, egress: 300 + 90 }] as const,
  ])(`estimates time for normal swap from %s to %s`, async (srcAsset, destAsset, expected) => {
    expect(await estimateSwapDuration({ srcAsset, destAsset })).toStrictEqual({
      durations: expected,
      total: expected.deposit + expected.swap + expected.egress,
    });
  });

  it.each([['Sol', 'Eth', { deposit: 0.4 + 0.8 + 60 + 6, swap: 12, egress: 96 }] as const])(
    `estimates time for a normal swap with ingress delay from %s to %s`,
    async (srcAsset, destAsset, expected) => {
      expect(await estimateSwapDuration({ srcAsset, destAsset })).toStrictEqual({
        durations: expected,
        total: expected.deposit + expected.swap + expected.egress,
      });
    },
  );

  it.each([
    ['Btc', 'Btc', { deposit: 300 + 6, swap: 12, egress: 300 + 90 }] as const,
    ['Btc', 'Eth', { deposit: 300 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Btc', 'HubDot', { deposit: 300 + 6, swap: 12, egress: 1.5 + 90 }] as const,
    ['Eth', 'Eth', { deposit: 6 + 6, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'HubDot', { deposit: 6 + 6, swap: 12, egress: 1.5 + 90 }] as const,
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
    ['Btc', 'HubDot', 20, { deposit: 300 + 6 + 120, swap: 12, egress: 1.5 + 90 }] as const,
    ['Eth', 'Eth', 5, { deposit: 6 + 6 + 30, swap: 12, egress: 6 + 90 }] as const,
    ['Eth', 'HubDot', 9, { deposit: 6 + 6 + 54, swap: 12, egress: 1.5 + 90 }] as const,
    ['Eth', 'Btc', 15, { deposit: 6 + 6 + 90, swap: 12, egress: 300 + 90 }] as const,
  ])(
    `estimates time for boosted swap from %s to %s when boost delay has been set`,
    async (srcAsset, destAsset, numBlocks, expected) => {
      mockRpcResponse(async () => ({
        data: environment({ boostDelay: { [assetConstants[srcAsset].chain]: numBlocks } }),
      }));

      expect(await estimateSwapDuration({ srcAsset, destAsset, boosted: true })).toStrictEqual({
        durations: expected,
        total: expected.deposit + expected.swap + expected.egress,
      });
    },
  );
});
