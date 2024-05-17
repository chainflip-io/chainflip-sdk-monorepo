import axios from 'axios';
import { boostPoolsDepth } from '@/shared/tests/fixtures';
import { getBoostPoolsDepth } from '../rpc';

jest.mock('axios');

const mockResponse = (data: any) => jest.mocked(axios.post).mockResolvedValueOnce({ data });

describe(getBoostPoolsDepth, () => {
  it('allows filtering by asset through all the boost pools', async () => {
    mockResponse(boostPoolsDepth());

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
