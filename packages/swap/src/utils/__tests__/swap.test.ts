import { environment } from '@/shared/tests/fixtures';
import { estimateSwapDuration } from '@/swap/utils/swap';

jest.mock('axios', () => ({
  post: jest.fn((url, data) => {
    if (data.method === 'cf_environment') {
      return Promise.resolve({
        data: environment(),
      });
    }

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  }),
}));

describe(estimateSwapDuration, () => {
  it.each([
    ['Btc', 'Btc', 600 + 2 * 600 + 3 * 6 + 600] as const,
    ['Btc', 'Eth', 600 + 2 * 600 + 3 * 6 + 12] as const,
    ['Btc', 'Dot', 600 + 2 * 600 + 3 * 6 + 6] as const,
    ['Eth', 'Eth', 12 + 12 + 3 * 6 + 12] as const,
    ['Eth', 'Dot', 12 + 12 + 3 * 6 + 6] as const,
    ['Eth', 'Btc', 12 + 12 + 3 * 6 + 600] as const,
  ])(`estimates time for swap from %s to %s`, async (fromChain, toChain, expected) => {
    expect(await estimateSwapDuration(fromChain, toChain)).toStrictEqual(expected);
  });
});
