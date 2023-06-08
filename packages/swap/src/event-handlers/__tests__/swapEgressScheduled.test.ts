import prisma from '../../client';
import swapEgressScheduled from '../swapEgressScheduled';
import {
  DOT_ADDRESS,
  createDepositChannel,
  swapEgressScheduledMock,
} from './utils';

const {
  eventContext: { event },
  block,
} = swapEgressScheduledMock;

describe(swapEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap" CASCADE`;
  });

  it('updates an existing swap with the scheduled timestamp', async () => {
    const { swapId } = event.args;

    await prisma.egress.create({
      data: {
        network: event.args.egressId[0].__kind,
        nativeId: BigInt(event.args.egressId[1]),
        amount: '1234567890',
        timestamp: new Date(block.timestamp),
      },
    });

    // store a new swap intent to initiate a new swap
    const swapDepositChannel = await createDepositChannel({
      swaps: {
        create: {
          nativeId: BigInt(swapId),
          depositAmount: '10000000000',
          depositReceivedAt: new Date(block.timestamp - 12000),
          depositReceivedBlockIndex: `${block.height - 100}-${
            event.indexInBlock
          }`,
          swapExecutedAt: new Date(block.timestamp - 6000),
          swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
          srcAsset: 'ETH',
          destAsset: 'DOT',
          destAddress: DOT_ADDRESS,
        },
      },
    });

    await prisma.$transaction((tx) =>
      swapEgressScheduled({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: {
        egress: {
          select: {
            amount: true,
            timestamp: true,
            network: true,
          },
        },
      },
    });

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
    });
  });
});
