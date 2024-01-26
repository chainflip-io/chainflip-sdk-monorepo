import {
  BTC_ADDRESS,
  ETH_ADDRESS,
  createDepositChannel,
  egressAmountZeroMock,
} from './utils';
import prisma, { Prisma } from '../../client';
import egressAmountZero from '../egressAmountZero';

describe(egressAmountZero, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "FailedSwap" CASCADE`;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  it('handles egressAmountZero event', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Ethereum',
      depositAddress: ETH_ADDRESS,
      channelId: 99n,
      destAsset: 'BTC',
      destAddress: BTC_ADDRESS,
    });

    await prisma.swap.create({
      data: {
        type: 'PRINCIPAL',
        swapDepositChannelId: channel.id,
        srcAsset: channel.srcAsset,
        destAsset: channel.destAsset,
        destAddress: channel.destAddress,
        depositReceivedBlockIndex: `xxx-xxx`,
        depositAmount: '1000000000',
        swapInputAmount: '1000000000',
        nativeId: 6969n,
        depositReceivedAt: new Date(egressAmountZeroMock.block.timestamp),
      },
    });

    const preEventChannel = await prisma.swapDepositChannel.findFirst({
      where: {
        id: 100n,
      },
      include: {
        swaps: true,
        failedSwaps: true,
      },
    });

    expect(preEventChannel?.swaps).toHaveLength(1);
    expect(preEventChannel?.failedSwaps).toHaveLength(0);

    await egressAmountZero({
      prisma,
      block: egressAmountZeroMock.block as any,
      event: egressAmountZeroMock.eventContext.event as any,
    });

    const postEventChannel = await prisma.swapDepositChannel.findFirst({
      where: {
        id: 100n,
      },
      include: {
        swaps: true,
        failedSwaps: true,
      },
    });

    expect(postEventChannel?.swaps).toHaveLength(1);
    expect(postEventChannel?.failedSwaps).toHaveLength(1);
    expect(postEventChannel?.failedSwaps[0]).toMatchObject({
      type: 'FAILED',
      reason: 'EgressAmountZero',
      swapDepositChannelId: 100n,
      srcChain: 'Ethereum',
      destAddress: BTC_ADDRESS,
      destChain: 'Bitcoin',
    });
    expect(postEventChannel?.failedSwaps[0].depositAmount.toString()).toEqual(
      '1000000000',
    );
  });

  it('does not store a swap if the swap is not found', async () => {
    prisma.swap.findUniqueOrThrow = jest
      .fn()
      .mockRejectedValueOnce({ message: 'Not found' });
    const spy = jest.spyOn(prisma.failedSwap, 'create');

    try {
      await egressAmountZero({
        prisma,
        block: egressAmountZeroMock.block as any,
        event: egressAmountZeroMock.eventContext.event as any,
      });
      expect(true).toBeFalsy();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        expect(err.message).toBe('No Swap found');
      }
    }

    expect(prisma.swap.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
  });

  describe('handles db constraints', () => {
    it('rejects when both swapId and swapDepositChannelId are null', async () => {
      const channel = await createDepositChannel({
        id: 111n,
        srcChain: 'Ethereum',
        depositAddress: ETH_ADDRESS,
        channelId: 99n,
        destAsset: 'BTC',
        destAddress: BTC_ADDRESS,
      });
      await prisma.swap.create({
        data: {
          type: 'PRINCIPAL',
          swapDepositChannelId: channel.id,
          srcAsset: channel.srcAsset,
          destAsset: channel.destAsset,
          destAddress: channel.destAddress,
          depositReceivedBlockIndex: `xxx-xxx`,
          depositAmount: '1000000000',
          swapInputAmount: '1000000000',
          nativeId: 6969n,
          depositReceivedAt: new Date(egressAmountZeroMock.block.timestamp),
        },
      });

      try {
        await prisma.failedSwap.create({
          data: {
            type: 'FAILED',
            reason: 'EgressAmountZero',
            srcChain: 'Ethereum',
            destAddress: BTC_ADDRESS,
            destChain: 'Bitcoin',
            depositAmount: '1000000000',
          },
        });
        expect(true).toBeFalsy();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });

  it('resolves when swapId is not null but deposit channel is null', async () => {
    const channel = await createDepositChannel({
      id: 111n,
      srcChain: 'Ethereum',
      depositAddress: ETH_ADDRESS,
      channelId: 99n,
      destAsset: 'BTC',
      destAddress: BTC_ADDRESS,
    });
    const swap = await prisma.swap.create({
      data: {
        type: 'PRINCIPAL',
        swapDepositChannelId: channel.id,
        srcAsset: channel.srcAsset,
        destAsset: channel.destAsset,
        destAddress: channel.destAddress,
        depositReceivedBlockIndex: `xxx-xxx`,
        depositAmount: '1000000000',
        swapInputAmount: '1000000000',
        nativeId: 6969n,
        depositReceivedAt: new Date(egressAmountZeroMock.block.timestamp),
      },
    });
    const res = await prisma.failedSwap.create({
      data: {
        type: 'FAILED',
        reason: 'EgressAmountZero',
        srcChain: 'Ethereum',
        destAddress: BTC_ADDRESS,
        destChain: 'Bitcoin',
        depositAmount: '1000000000',
        swapId: swap.id,
      },
    });
    expect(res).toMatchObject({
      swapId: swap.id,
    });
  });

  it('resolves when swapId null but deposit channel is not null', async () => {
    const channel = await createDepositChannel({
      id: 111n,
      srcChain: 'Ethereum',
      depositAddress: ETH_ADDRESS,
      channelId: 99n,
      destAsset: 'BTC',
      destAddress: BTC_ADDRESS,
    });
    await prisma.swap.create({
      data: {
        type: 'PRINCIPAL',
        swapDepositChannelId: channel.id,
        srcAsset: channel.srcAsset,
        destAsset: channel.destAsset,
        destAddress: channel.destAddress,
        depositReceivedBlockIndex: `xxx-xxx`,
        depositAmount: '1000000000',
        swapInputAmount: '1000000000',
        nativeId: 6969n,
        depositReceivedAt: new Date(egressAmountZeroMock.block.timestamp),
      },
    });
    const res = await prisma.failedSwap.create({
      data: {
        type: 'FAILED',
        reason: 'EgressAmountZero',
        srcChain: 'Ethereum',
        destAddress: BTC_ADDRESS,
        destChain: 'Bitcoin',
        depositAmount: '1000000000',
        swapDepositChannelId: channel.id,
      },
    });
    expect(res).toMatchObject({
      swapDepositChannelId: channel.id,
    });
  });
});
