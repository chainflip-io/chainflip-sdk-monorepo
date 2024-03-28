import { InternalAssets } from '@/shared/enums';
import { DOT_ADDRESS, buildSwapExecutedMock, createDepositChannel } from './utils';
import prisma from '../../client';
import swapExecuted from '../swapExecuted';

jest.mock('@/shared/consts', () => ({
  ...jest.requireActual('@/shared/consts'),
  getPoolsNetworkFeeHundredthPips: jest.fn().mockReturnValue(1000),
}));

describe(swapExecuted, () => {
  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
    await prisma.pool.createMany({
      data: [
        {
          baseAsset: 'Eth',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 1000,
        },

        {
          baseAsset: 'Dot',
          quoteAsset: 'Usdc',
          liquidityFeeHundredthPips: 1500,
        },
      ],
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap" CASCADE`;
  });

  it.each([[{ egressAmount: '10000000000' }], [{ swapOutput: '10000000000' }]] as const)(
    'updates an existing swap',
    async (amount) => {
      const {
        eventContext: { event },
        block,
      } = buildSwapExecutedMock({
        swapId: '9876545',
        ...amount,
        destinationAsset: {
          __kind: 'Flip',
        },
        sourceAsset: {
          __kind: 'Btc',
        },
      });

      const { swapId } = event.args;

      // store a new swap intent to initiate a new swap
      const swapDepositChannel = await createDepositChannel({
        swaps: {
          create: {
            nativeId: BigInt(swapId),
            depositAmount: '10000000000',
            swapInputAmount: '10000000000',
            depositReceivedAt: new Date(block.timestamp - 6000),
            depositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
            srcAsset: InternalAssets.Eth,
            destAsset: InternalAssets.Usdc,
            destAddress: DOT_ADDRESS,
            type: 'SWAP',
          },
        },
      });

      await prisma.$transaction((tx) =>
        swapExecuted({
          block: block as any,
          event: event as any,
          prisma: tx,
        }),
      );

      const swap = await prisma.swap.findFirstOrThrow({
        where: { swapDepositChannelId: swapDepositChannel.id },
        include: { fees: true },
      });

      expect(swap).toMatchSnapshot({
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        swapDepositChannelId: expect.any(BigInt),
        fees: [
          { id: expect.any(BigInt), swapId: expect.any(BigInt) },
          { id: expect.any(BigInt), swapId: expect.any(BigInt) },
        ],
      });
    },
  );

  it('updates an existing swap with intermediate amount', async () => {
    const {
      eventContext: { event },
      block,
    } = buildSwapExecutedMock({
      swapId: '9876545',
      egressAmount: '10000000000',
      intermediateAmount: '100000',
      destinationAsset: {
        __kind: 'Flip',
      },
      sourceAsset: {
        __kind: 'Eth',
      },
    });

    const { swapId } = event.args;

    // store a new swap intent to initiate a new swap
    const swapDepositChannel = await createDepositChannel({
      swaps: {
        create: {
          nativeId: BigInt(swapId),
          depositAmount: '10000000000',
          swapInputAmount: '10000000000',
          depositReceivedAt: new Date(block.timestamp - 6000),
          depositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
          srcAsset: InternalAssets.Eth,
          destAsset: InternalAssets.Dot,
          destAddress: DOT_ADDRESS,
          type: 'SWAP',
        },
      },
    });

    await prisma.$transaction((tx) =>
      swapExecuted({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: { fees: true },
    });

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      fees: [
        { id: expect.any(BigInt), swapId: expect.any(BigInt) },
        { id: expect.any(BigInt), swapId: expect.any(BigInt) },
        { id: expect.any(BigInt), swapId: expect.any(BigInt) },
      ],
    });
  });
  it('ignores burn swaps', async () => {
    const {
      eventContext: { event },
      block,
    } = buildSwapExecutedMock({
      swapId: '9876545',
      egressAmount: '10000000000',
      intermediateAmount: '100000',
      destinationAsset: {
        __kind: 'Flip',
      },
      sourceAsset: {
        __kind: 'Usdc',
      },
    });

    await prisma.$transaction((tx) =>
      swapExecuted({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    expect(await prisma.swap.count()).toBe(0);
  });
});
