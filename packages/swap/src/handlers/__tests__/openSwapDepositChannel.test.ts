import axios from 'axios';
import * as broker from '@/shared/broker';
import prisma from '../../client';
import openSwapDepositChannel from '../openSwapDepositChannel';

jest.mock('@/shared/broker', () => ({
  requestSwapDepositAddress: jest.fn(),
}));

jest.mock('axios');

describe(openSwapDepositChannel, () => {
  beforeAll(() => {
    jest
      .useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
      .setSystemTime(new Date('2022-01-01'));
  });

  it('gathers and inserts the deposit channel info', async () => {
    jest.mocked(axios.post).mockResolvedValueOnce({
      data: {
        result: {
          minimum_swap_amounts: {
            Polkadot: { Dot: '0x0' },
            Bitcoin: { Btc: '0x0' },
            Ethereum: { Flip: '0x0', Eth: '0x0', Usdc: '0x0' },
          },
        },
      },
    } as any);

    jest.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: BigInt('888'),
      issuedBlock: 123,
    });

    prisma.swapDepositChannel.upsert = jest.fn().mockResolvedValueOnce({
      issuedBlock: 123,
      srcChain: 'Ethereum',
      channelId: '888',
      depositAddress: 'address',
    });
    prisma.chainTracking.findFirst = jest.fn().mockResolvedValueOnce({
      height: BigInt('125'),
    });

    const result = await openSwapDepositChannel({
      srcAsset: { asset: 'FLIP', chain: 'Ethereum' },
      destAsset: { asset: 'DOT', chain: 'Polkadot' },
      destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
      expectedDepositAmount: '777',
    });

    expect(result).toEqual({
      depositAddress: 'address',
      estimatedExpiryTime: 1641008325000,
      id: '123-Ethereum-888',
      issuedBlock: 123,
      srcChainExpiryBlock: 1000n,
    });
    expect(prisma.swapDepositChannel.upsert).toHaveBeenCalledWith({
      where: {
        issuedBlock_srcChain_channelId: {
          channelId: 888n,
          issuedBlock: 123,
          srcChain: 'Ethereum',
        },
      },
      create: {
        channelId: 888n,
        depositAddress: 'address',
        srcChainExpiryBlock: 1000n,
        destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
        destAsset: 'DOT',
        expectedDepositAmount: '777',
        issuedBlock: 123,
        srcAsset: 'FLIP',
        srcChain: 'Ethereum',
      },
      update: {},
    });
  });
});
