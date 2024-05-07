import axios from 'axios';
import { InternalAsset, getAssetAndChain } from '@/shared/enums';
import { MockedBoostPoolsDepth, boostPoolsDepth } from '@/shared/tests/fixtures';
import { getBoostFeeBpsForAmount } from '../boost';

jest.mock('axios');

const mockResponse = (data: any) => jest.mocked(axios.post).mockResolvedValueOnce({ data });

const mockBoostPoolDepth = ({
  asset,
  tier,
  amount,
}: {
  asset: InternalAsset;
  tier: number;
  amount: bigint;
}) =>
  ({
    ...getAssetAndChain(asset),
    tier,
    available_amount: `0x${amount.toString(16)}`,
  }) as const;

describe(getBoostFeeBpsForAmount, () => {
  it.each([
    [
      BigInt(1e8),
      'Btc' as InternalAsset,
      [
        mockBoostPoolDepth({ asset: 'Btc', tier: 10, amount: BigInt(0) }),
        mockBoostPoolDepth({ asset: 'Btc', tier: 100, amount: BigInt(1e8) }),
      ] as const,
      100,
    ],

    [
      BigInt(1e8),
      'Btc' as InternalAsset,
      [
        mockBoostPoolDepth({ asset: 'Btc', tier: 10, amount: BigInt(1e8) }),
        mockBoostPoolDepth({ asset: 'Btc', tier: 100, amount: BigInt(0) }),
      ] as const,
      10,
    ],
    [
      BigInt(1e8),
      'Btc' as InternalAsset,
      [
        mockBoostPoolDepth({ asset: 'Btc', tier: 5, amount: BigInt(0.5e8) }),
        mockBoostPoolDepth({ asset: 'Btc', tier: 10, amount: BigInt(0.5e8) }),
      ] as const,
      7,
    ],
    [
      BigInt(1e8),
      'Btc' as InternalAsset,
      [
        mockBoostPoolDepth({ asset: 'Btc', tier: 10, amount: BigInt(0.1e8) }),
        mockBoostPoolDepth({ asset: 'Btc', tier: 100, amount: BigInt(0.9e8) }),
      ] as const,
      91,
    ],
  ])(
    'calculates boost fee for %s',
    async (ingressAmount, asset, mockedBoostPoolsDepth, boostBps) => {
      mockResponse(boostPoolsDepth(mockedBoostPoolsDepth as unknown as MockedBoostPoolsDepth));
      expect(
        await getBoostFeeBpsForAmount({
          amount: ingressAmount,
          asset,
        }),
      ).toBe(boostBps);
    },
  );
});
