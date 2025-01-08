import { describe, it, expect, beforeAll } from 'vitest';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures';
import { estimateSwapDuration } from '@/swap/utils/swap';

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
});
