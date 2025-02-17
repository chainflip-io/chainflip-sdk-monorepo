import { vi, describe, it, beforeAll, beforeEach, afterEach, expect } from 'vitest';
import * as broker from '@/shared/broker';
import { environment, mockRpcResponse } from '@/shared/tests/fixtures';
import env from '@/swap/config/env';
import prisma from '../../client';
import isDisallowedSwap from '../../utils/isDisallowedSwap';
import { openSwapDepositChannel, openSwapDepositChannelSchema } from '../openSwapDepositChannel';

vi.mock('@/shared/broker', () => ({
  requestSwapDepositAddress: vi.fn(),
}));

vi.mock('../../utils/isDisallowedSwap', () => ({
  default: vi.fn().mockResolvedValue(false),
}));

describe(openSwapDepositChannel, () => {
  let oldEnv: typeof env;

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['performance', 'Date'] }).setSystemTime(new Date('2022-01-01'));
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
    vi.resetAllMocks();
    oldEnv = structuredClone(env);
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", private."DepositChannel" CASCADE`;
  });

  afterEach(() => {
    Object.assign(env, oldEnv);
  });

  it('creates channel and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 888,
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
      fillOrKillParams: {
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        retryDurationBlocks: 2,
        minPriceX128: '1',
      },
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
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst({ include: { quote: true } })).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
      },
    );
  });

  it('creates channel and stores channel and quote in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 888,
      issuedBlock: 123,
      channelOpeningFee: 100n,
    });

    const result = await openSwapDepositChannel({
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'DOT',
      destChain: 'Polkadot',
      destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
      expectedDepositAmount: '1000',
      quote: {
        intermediateAmount: '500',
        egressAmount: '250',
        estimatedPrice: '0.375',
        recommendedSlippageTolerancePercent: 0.25,
      },
      fillOrKillParams: {
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        retryDurationBlocks: 2,
        minPriceX128: '1',
      },
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
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst({ include: { quote: true } })).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        quote: {
          id: expect.any(Number),
          swapDepositChannelId: expect.any(BigInt),
        },
      },
    );
  });

  it('creates channel with boost and dca and stores quote in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 888,
      issuedBlock: 123,
      channelOpeningFee: 100n,
    });

    const result = await openSwapDepositChannel({
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'DOT',
      destChain: 'Polkadot',
      destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
      expectedDepositAmount: '1000',
      maxBoostFeeBps: 100,
      fillOrKillParams: {
        retryDurationBlocks: 500,
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        minPriceX128: '1094494073153147181099038525207',
      },
      dcaParams: {
        chunkIntervalBlocks: 2,
        numberOfChunks: 3,
      },
      quote: {
        intermediateAmount: '500',
        egressAmount: '250',
        estimatedPrice: '0.32820704083381790449',
      },
    });

    expect(result).toEqual({
      maxBoostFeeBps: 100,
      depositAddress: 'address',
      brokerCommissionBps: 0,
      estimatedExpiryTime: 1699534500000,
      id: '123-Ethereum-888',
      issuedBlock: 123,
      srcChainExpiryBlock: 1000n,
      channelOpeningFee: 100n,
    });
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst({ include: { quote: true } })).toMatchSnapshot(
      {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        quote: {
          id: expect.any(Number),
          swapDepositChannelId: expect.any(BigInt),
        },
      },
    );
  });

  it('creates channel with ccmParams and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 909,
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
        additionalData: undefined,
      },
      fillOrKillParams: {
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        retryDurationBlocks: 2,
        minPriceX128: '1',
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
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates channel with fill or kill params and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 909,
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
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
    });
  });

  it('creates channel with boost fee and stores it in the database', async () => {
    mockRpcResponse({ data: environment() });
    vi.mocked(broker.requestSwapDepositAddress).mockResolvedValueOnce({
      sourceChainExpiryBlock: BigInt('1000'),
      address: 'address',
      channelId: 909,
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
      fillOrKillParams: {
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        retryDurationBlocks: 2,
        minPriceX128: '1',
      },
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
    expect(vi.mocked(broker.requestSwapDepositAddress).mock.calls).toMatchSnapshot();
    expect(await prisma.swapDepositChannel.findFirst()).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      maxBoostFeeBps: 100,
    });
  });

  it('rejects sanctioned addresses', async () => {
    vi.mocked(isDisallowedSwap).mockResolvedValueOnce(true);

    await expect(
      openSwapDepositChannel({
        srcAsset: 'FLIP',
        srcChain: 'Ethereum',
        destAsset: 'DOT',
        destChain: 'Polkadot',
        destAddress: '5FAGoHvkBsUMnoD3W95JoVTvT8jgeFpjhFK8W73memyGBcBd',
        expectedDepositAmount: '777',
        fillOrKillParams: {
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retryDurationBlocks: 2,
          minPriceX128: '1',
        },
      }),
    ).rejects.toThrow('Failed to open deposit channel, please try again later');
    expect(vi.mocked(isDisallowedSwap).mock.calls).toMatchSnapshot();
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
        fillOrKillParams: {
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retryDurationBlocks: 2,
          minPriceX128: '1',
        },
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
        fillOrKillParams: {
          refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          retryDurationBlocks: 2,
          minPriceX128: '1',
        },
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
      fillOrKillParams: {
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        retryDurationBlocks: 2,
        minPriceX128: '1',
      },
    } as const;

    mockRpcResponse({ data: environment() });

    let channelId = 0;
    vi.mocked(broker.requestSwapDepositAddress).mockImplementation(async () =>
      Promise.resolve({
        sourceChainExpiryBlock: BigInt('1000'),
        address: `address${++channelId}`, // eslint-disable-line no-plusplus
        channelId: 888,
        issuedBlock: 123 + channelId,
        channelOpeningFee: 100n,
      }),
    );

    for (let i = 0; i < 5; i += 1) {
      await expect(openSwapDepositChannel(opts)).resolves.not.toThrow();
    }

    await expect(openSwapDepositChannel({ ...opts })).rejects.toThrow('too many channels');

    await expect(
      openSwapDepositChannel({ ...opts, destAddress: opts.destAddress.toLowerCase() }),
    ).rejects.toThrow('too many channels');
  });

  it('rejects if too many channels with same ccm message are open', async () => {
    env.MAX_CHANNELS_OPEN_PER_ADDRESS = 5;

    const opts = {
      srcAsset: 'FLIP',
      srcChain: 'Ethereum',
      destAsset: 'ETH',
      destChain: 'Ethereum',
      destAddress: '0x72a5843cc08275C8171E582972Aa4fDa8C397B2A',
      expectedDepositAmount: '777',
      fillOrKillParams: {
        refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        retryDurationBlocks: 2,
        minPriceX128: '1',
      },
      ccmParams: {
        message: '0xdeadbeef',
        gasBudget: '0x1000',
        additionalData: undefined,
      },
    } as const;

    mockRpcResponse({ data: environment() });

    let channelId = 0;
    vi.mocked(broker.requestSwapDepositAddress).mockImplementation(async () =>
      Promise.resolve({
        sourceChainExpiryBlock: BigInt('1000'),
        address: `address${++channelId}`, // eslint-disable-line no-plusplus
        channelId: 888,
        issuedBlock: 123 + channelId,
        channelOpeningFee: 100n,
      }),
    );

    for (let i = 0; i < 5; i += 1) {
      await expect(openSwapDepositChannel(opts)).resolves.not.toThrow();
    }

    await expect(openSwapDepositChannel({ ...opts })).rejects.toThrow('too many channels');

    // accepts channel with different message
    await expect(
      openSwapDepositChannel({
        ...opts,
        ccmParams: { ...opts.ccmParams, message: `0xc0ffee` },
      }),
    ).resolves.not.toThrow();
  });
});

describe('openSwapDepositChannelSchema', () => {
  const swapBody = {
    srcAsset: 'BTC',
    srcChain: 'Bitcoin',
    destAsset: 'ETH',
    destChain: 'Ethereum',
    destAddress: '0x123',
    amount: '123',
    fillOrKillParams: {
      retryDurationBlocks: 2,
      refundAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
      minPriceX128: '1',
    },
  };

  it('handles empty ccmParams strings', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
      }),
    ).not.toThrow();
  });

  it('handles full ccmParams', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
          cfParameters: '0xcafebabe',
        },
      }),
    ).not.toThrow();
  });

  it('handles without cf parameters', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
        },
      }),
    ).not.toThrow();
  });

  it('handles missing ccm params', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        ccmParams: {
          gasBudget: '123',
        },
      }),
    ).toThrow();
  });

  it('handles other missing ccm params', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        ccmParams: {
          message: '0xdeadc0de',
          cfParameters: '0xcafebabe',
        },
      }),
    ).toThrow();
  });

  it('handles missing swap body params', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        srcAsset: 'BTC',
        destAsset: 'ETH',
        destAddress: '0x123',
        ccmParams: {
          gasBudget: '123',
          message: '0xdeadc0de',
          cfParameters: '0xcafebabe',
        },
      }),
    ).toThrow();
  });

  it('handles missing dca params', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        dcaParams: {
          numberOfChunks: 1,
        },
      }),
    ).toThrow();
  });

  it('allows FoK params without DCA params', () => {
    expect(() =>
      openSwapDepositChannelSchema.parse({
        ...swapBody,
        fillOrKillParams: {
          retryDurationBlocks: 10,
          refundAddress: '0x1234',
          minPriceX128: '1',
        },
      }),
    ).not.toThrow();
  });
});
