import * as broker from '@/shared/broker';
import prisma from '../../client';
import openSwapDepositChannel from '../openSwapDepositChannel';

jest.mock('@/shared/broker', () => ({
  requestSwapDepositAddress: jest.fn(),
}));

describe('openSwapDepositChannel', () => {
  beforeAll(() => {
    jest
      .useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
      .setSystemTime(new Date('2022-01-01'));
  });

  it('should gather and insert the deposit channel info', async () => {
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
      srcAsset: 'FLIP',
      destAsset: 'DOT',
      srcChain: 'Ethereum',
      destChain: 'Polkadot',
      destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
      expectedDepositAmount: '777',
    });

    expect(result).toEqual({
      depositAddress: 'address',
      depositChannelExpiryTime: 1641008325000,
      id: '123-Ethereum-888',
      issuedBlock: 123,
      sourceChainExpiryBlock: 1000n,
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
