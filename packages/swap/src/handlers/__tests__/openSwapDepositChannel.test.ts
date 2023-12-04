import axios from 'axios';
import * as broker from '@/shared/broker';
import { swappingEnvironment } from '@/shared/tests/fixtures';
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
    jest
      .mocked(axios.post)
      .mockResolvedValueOnce({ data: swappingEnvironment() });

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
      chain: 'Ethereum',
      height: BigInt('125'),
      blockTrackedAt: new Date('2023-11-09T10:00:00.000Z'),
    });

    const result = await openSwapDepositChannel({
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'DOT',
      destChain: 'Polkadot',
      destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
      expectedDepositAmount: '777',
    });

    expect(result).toEqual({
      depositAddress: 'address',
      estimatedExpiryTime: 1699537125000,
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
        estimatedExpiryAt: new Date('2023-11-09T13:38:45.000Z'),
        expectedDepositAmount: '777',
        issuedBlock: 123,
        srcAsset: 'FLIP',
        srcChain: 'Ethereum',
        openedWithCfBroker: true,
      },
      update: {},
    });
  });
});
