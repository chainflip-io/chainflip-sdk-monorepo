import { BoostPoolsDepth } from '@/shared/rpc';
import { getBoostFeeBpsForAmount } from '../boost';

jest.mock('axios');

describe(getBoostFeeBpsForAmount, () => {
  it.each([
    [
      BigInt(1e8),
      [
        { asset: 'BTC', chain: 'Bitcoin', tier: 10, availableAmount: BigInt(0) },
        { asset: 'BTC', chain: 'Bitcoin', tier: 100, availableAmount: BigInt(1e8) },
      ] as BoostPoolsDepth,
      100,
    ],

    [
      BigInt(1e8),
      [
        { asset: 'BTC', chain: 'Bitcoin', tier: 10, availableAmount: BigInt(1e8) },
        { asset: 'BTC', chain: 'Bitcoin', tier: 100, availableAmount: BigInt(0) },
      ] as BoostPoolsDepth,
      10,
    ],
    [
      BigInt(1e8),
      [
        { asset: 'BTC', chain: 'Bitcoin', tier: 5, availableAmount: BigInt(0.5e8) },
        { asset: 'BTC', chain: 'Bitcoin', tier: 10, availableAmount: BigInt(0.5e8) },
      ] as BoostPoolsDepth,
      7,
    ],
    [
      BigInt(1e8),
      [
        { asset: 'BTC', chain: 'Bitcoin', tier: 10, availableAmount: BigInt(0.1e8) },
        { asset: 'BTC', chain: 'Bitcoin', tier: 100, availableAmount: BigInt(0.9e8) },
      ] as BoostPoolsDepth,
      91,
    ],
  ])('calculates boost fee for %s', async (ingressAmount, assetBoostPoolsDepth, boostBps) => {
    expect(
      await getBoostFeeBpsForAmount({
        amount: ingressAmount,
        assetBoostPoolsDepth,
      }),
    ).toBe(boostBps);
  });
});
