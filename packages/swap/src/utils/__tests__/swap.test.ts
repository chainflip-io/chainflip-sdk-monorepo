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
    ['Bitcoin', 'Bitcoin', 600 + 2 * 600 + 3 * 6 + 600] as const,
    ['Bitcoin', 'Ethereum', 600 + 2 * 600 + 3 * 6 + 12] as const,
    ['Bitcoin', 'Polkadot', 600 + 2 * 600 + 3 * 6 + 6] as const,
    ['Ethereum', 'Ethereum', 12 + 12 + 3 * 6 + 12] as const,
    ['Ethereum', 'Polkadot', 12 + 12 + 3 * 6 + 6] as const,
    ['Ethereum', 'Bitcoin', 12 + 12 + 3 * 6 + 600] as const,
  ])(
    `estimates time for swap from %s to %s`,
    async (fromChain, toChain, expected) => {
      expect(await estimateSwapDuration(fromChain, toChain)).toStrictEqual(
        expected,
      );
    },
  );
});
