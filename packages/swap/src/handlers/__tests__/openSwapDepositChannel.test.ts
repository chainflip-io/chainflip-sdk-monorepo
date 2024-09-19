import * as broker from '@/shared/broker';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures';
import env from '@/swap/config/env';
import prisma from '../../client';
import disallowChannel from '../../utils/disallowChannel';
import openSwapDepositChannel from '../openSwapDepositChannel';

jest.mock('@/shared/broker', () => ({
  requestSwapDepositAddress: jest.fn(),
}));

jest.mock('../../utils/disallowChannel', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(false),
}));

describe(openSwapDepositChannel, () => {
  let oldEnv: typeof env;

  beforeAll(async () => {
    jest
      .useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
      .setSystemTime(new Date('2022-01-01'));

    await prisma.$queryRaw`TRUNCATE TABLE "ChainTracking" CASCADE`;
    await prisma.chainTracking.create({
      data: {
        chain: 'Ethereum',
        height: BigInt('125'),
        blockTrackedAt: new Date('2023-11-09T10:00:00.000Z'),
        eventWitnessedBlock: 1,
      },
    });
  });

  beforeEach(async () => {
    oldEnv = structuredClone(env);
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel" CASCADE`;
  });

  afterEach(() => {
    Object.assign(env, oldEnv);
  });

  it('creates channel and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    jest.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: BigInt('888'),
      issuedBlock: 123,
      channelOpeningFee: 100n,
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
      maxBoostFeeBps: 0,
      depositAddress: 'address',
      brokerCommissionBps: 0,
      estimatedExpiryTime: 1699534500000,
      id: '123-Ethereum-888',
      issuedBlock: 123,
      srcChainExpiryBlock: 1000n,
      channelOpeningFee: 100n,
    });
    expect(jest.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates channel with ccmParams and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    jest.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: BigInt('909'),
      issuedBlock: 123,
      channelOpeningFee: 10n,
    });

    const result = await openSwapDepositChannel({
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'USDC',
      destChain: 'Ethereum',
      destAddress: '0xFcd3C82b154CB4717Ac98718D0Fd13EEBA3D2754',
      expectedDepositAmount: '10101010',
      ccmParams: {
        message: '0xdeadc0de',
        gasBudget: `0x${(125000).toString(16)}`,
      },
    });

    expect(result).toEqual({
      maxBoostFeeBps: 0,
      depositAddress: 'address',
      brokerCommissionBps: 0,
      estimatedExpiryTime: 1699534500000,
      id: '123-Ethereum-909',
      issuedBlock: 123,
      srcChainExpiryBlock: 1000n,
      channelOpeningFee: 10n,
    });
    expect(jest.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates channel with fill or kill params and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    jest.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: BigInt('909'),
      issuedBlock: 123,
      channelOpeningFee: 10n,
    });

    const result = await openSwapDepositChannel({
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'USDC',
      destChain: 'Ethereum',
      destAddress: '0xFcd3C82b154CB4717Ac98718D0Fd13EEBA3D2754',
      expectedDepositAmount: '10101010',
      fillOrKillParams: {
        retryDurationBlocks: 500,
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        minPriceX128: '10000000000000',
      },
      dcaParams: {
        chunkIntervalBlocks: 2,
        numberOfChunks: 3,
      },
    });

    expect(result).toEqual({
      maxBoostFeeBps: 0,
      depositAddress: 'address',
      brokerCommissionBps: 0,
      estimatedExpiryTime: 1699534500000,
      id: '123-Ethereum-909',
      issuedBlock: 123,
      srcChainExpiryBlock: 1000n,
      channelOpeningFee: 10n,
    });
    expect(jest.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates channel with boost fee and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    jest.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: BigInt('909'),
      issuedBlock: 123,
      channelOpeningFee: 0n,
    });

    const result = await openSwapDepositChannel({
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'USDC',
      destChain: 'Ethereum',
      destAddress: '0xFcd3C82b154CB4717Ac98718D0Fd13EEBA3D2754',
      expectedDepositAmount: '10101010',
      maxBoostFeeBps: 100,
    });

    expect(result).toEqual({
      maxBoostFeeBps: 100,
      depositAddress: 'address',
      brokerCommissionBps: 0,
      estimatedExpiryTime: 1699534500000,
      id: '123-Ethereum-909',
      issuedBlock: 123,
      srcChainExpiryBlock: 1000n,
      channelOpeningFee: 0n,
    });
    expect(jest.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      maxBoostFeeBps: 100,
    });
  });

  it('rejects sanctioned addresses', async () => {
    jest.mocked(disallowChannel).mockResolvedValueOnce(true);

    await expect(
      openSwapDepositChannel({
        srcAsset: 'FLIP',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
        expectedDepositAmount: '777',
      }),
    ).rejects.toThrow('Failed to open deposit channel, please try again later');
  });

  it('rejects if source asset is disabled', async () => {
    env.DISABLED_INTERNAL_ASSETS = ['Flip', 'Btc'];

    await expect(
      openSwapDepositChannel({
        srcAsset: 'FLIP',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
        expectedDepositAmount: '777',
      }),
    ).rejects.toThrow('Asset Flip is disabled');
  });

  it('rejects if destination asset is disabled', async () => {
    env.DISABLED_INTERNAL_ASSETS = ['Btc', 'Dot'];

    await expect(
      openSwapDepositChannel({
        srcAsset: 'FLIP',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
        expectedDepositAmount: '777',
      }),
    ).rejects.toThrow('Asset Dot is disabled');
  });

  it('rejects if too many channels are open', async () => {
    env.MAX_CHANNELS_OPEN_PER_ADDRESS = 5;

    const opts = {
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'ETH',
      destChain: 'Ethereum',
      destAddress: '0x72a5843cc08275C8171E582972Aa4fDa8C397B2A',
      expectedDepositAmount: '777',
    } as const;

    mockRpcResponse({ data: environment() });
    for (let i = 0; i < 5; i += 1) {
      jest.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
        sourceChainExpiryBlock: BigInt('1000'),
        address: `address${i}`,
        channelId: BigInt('888'),
        issuedBlock: 123 + i,
        channelOpeningFee: 100n,
      });
      await expect(openSwapDepositChannel(opts)).resolves.not.toThrow();
    }

    jest.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: BigInt('888'),
      issuedBlock: 123,
      channelOpeningFee: 100n,
    });

    await expect(
      openSwapDepositChannel({ ...opts, destAddress: opts.destAddress.toLowerCase() }),
    ).rejects.toThrow('too many channels');
  });
});
