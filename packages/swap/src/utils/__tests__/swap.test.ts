import { environment, mockRpcResponse } from '@/shared/tests/fixtures';
import { estimateSwapDuration } from '@/swap/utils/swap';

mockRpcResponse((url, data) => {
  if (data.method === 'cf_environment') {
    return Promise.resolve({
      data: environment(),
    });
  }

  throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
});

describe(estimateSwapDuration, () => {
  it.each([
    ['Btc', 'Btc', { deposit: 600 + 2 * 600, swap: 12, egress: 600 }] as const,
    ['Btc', 'Eth', { deposit: 600 + 2 * 600, swap: 12, egress: 12 }] as const,
    ['Btc', 'Dot', { deposit: 600 + 2 * 600, swap: 12, egress: 6 }] as const,
    ['Eth', 'Eth', { deposit: 12 + 12, swap: 12, egress: 12 }] as const,
    ['Eth', 'Dot', { deposit: 12 + 12, swap: 12, egress: 6 }] as const,
    ['Eth', 'Btc', { deposit: 12 + 12, swap: 12, egress: 600 }] as const,
  ])(`estimates time for normal swap from %s to %s`, async (srcAsset, destAsset, expected) => {
    expect(await estimateSwapDuration({ srcAsset, destAsset })).toStrictEqual(expected);
  });

  it.each([
    ['Btc', 'Btc', { deposit: 600, swap: 12, egress: 600 }] as const,
    ['Btc', 'Eth', { deposit: 600, swap: 12, egress: 12 }] as const,
    ['Btc', 'Dot', { deposit: 600, swap: 12, egress: 6 }] as const,
    ['Eth', 'Eth', { deposit: 12, swap: 12, egress: 12 }] as const,
    ['Eth', 'Dot', { deposit: 12, swap: 12, egress: 6 }] as const,
    ['Eth', 'Btc', { deposit: 12, swap: 12, egress: 600 }] as const,
  ])(`estimates time for boosted swap from %s to %s`, async (srcAsset, destAsset, expected) => {
    expect(await estimateSwapDuration({ srcAsset, destAsset, boosted: true })).toStrictEqual(
      expected,
    );
  });
});
