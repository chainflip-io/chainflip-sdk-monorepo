import { boostPoolsDepth, mockRpcResponse } from '@/shared/tests/fixtures';
import { getBoostPoolsDepth } from '../rpc';

describe(getBoostPoolsDepth, () => {
  it('allows filtering by asset through all the boost pools', async () => {
    mockRpcResponse(async () => ({ data: boostPoolsDepth() }));

    const assetBoostPoolsDepth = await getBoostPoolsDepth({
      asset: 'Btc',
    });

    assetBoostPoolsDepth.forEach((boostPoolDepth) => {
      expect(boostPoolDepth).toMatchSnapshot({
        asset: 'BTC',
        chain: 'Bitcoin',
        availableAmount: expect.any(BigInt),
        tier: expect.any(Number),
      });
    });
  });
});
