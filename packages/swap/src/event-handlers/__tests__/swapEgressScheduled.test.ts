import { Assets } from '@/shared/enums';
import { environment, swapRate } from '@/shared/tests/fixtures';
import {
  DOT_ADDRESS,
  createDepositChannel,
  swapEgressScheduledMock,
  ETH_ADDRESS,
} from './utils';
import prisma from '../../client';
import swapEgressScheduled from '../swapEgressScheduled';

const {
  eventContext: { event },
  block,
} = swapEgressScheduledMock;

jest.mock('axios', () => ({
  post: jest.fn((url, data) => {
    if (data.method === 'cf_environment') {
      return Promise.resolve({ data: environment({ egressFee: '0x777777' }) });
    }

    if (data.method === 'cf_swap_rate') {
      return Promise.resolve({
        data: swapRate({
          output: `0x${(BigInt(data.params[2]) * 3n).toString(16)}`,
        }),
      });
    }

    throw new Error(`unexpected axios call to ${url}: ${JSON.stringify(data)}`);
  }),
}));

describe(swapEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress" CASCADE`;
  });

  it('updates an existing swap when the egress asset is the native asset', async () => {
    const { swapId } = event.args;

    await prisma.egress.create({
      data: {
        chain: event.args.egressId[0].__kind,
        nativeId: BigInt(event.args.egressId[1]),
        amount: '1234567890',
        scheduledAt: new Date(block.timestamp),
        scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });

    // store a new swap intent to initiate a new swap
    const swapDepositChannel = await createDepositChannel({
      swaps: {
        create: {
          nativeId: BigInt(swapId),
          depositAmount: '10000000000',
          srcAmount: '10000000000',
          destAmount: '10000000000',
          depositReceivedAt: new Date(block.timestamp - 12000),
          depositReceivedBlockIndex: `${block.height - 100}-${
            event.indexInBlock
          }`,
          swapExecutedAt: new Date(block.timestamp - 6000),
          swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
          srcAsset: Assets.ETH,
          destAsset: Assets.DOT,
          destAddress: DOT_ADDRESS,
          type: 'SWAP',
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
            scheduledAt: true,
            chain: true,
          },
        },
        fees: true,
      },
    });

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      egressId: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      fees: [{ id: expect.any(BigInt), swapId: expect.any(BigInt) }],
    });
  });

  it('updates an existing swap when the egress asset is not the native asset', async () => {
    const { swapId } = event.args;

    await prisma.egress.create({
      data: {
        chain: event.args.egressId[0].__kind,
        nativeId: BigInt(event.args.egressId[1]),
        amount: '1234567890',
        scheduledAt: new Date(block.timestamp),
        scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });

    // store a new swap intent to initiate a new swap
    const swapDepositChannel = await createDepositChannel({
      swaps: {
        create: {
          nativeId: BigInt(swapId),
          depositAmount: '10000000000',
          srcAmount: '10000000000',
          destAmount: '10000000000',
          depositReceivedAt: new Date(block.timestamp - 12000),
          depositReceivedBlockIndex: `${block.height - 100}-${
            event.indexInBlock
          }`,
          swapExecutedAt: new Date(block.timestamp - 6000),
          swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
          srcAsset: Assets.ETH,
          destAsset: Assets.USDC,
          destAddress: ETH_ADDRESS,
          type: 'SWAP',
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
            scheduledAt: true,
            chain: true,
          },
        },
        fees: true,
      },
    });

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      egressId: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      fees: [{ id: expect.any(BigInt), swapId: expect.any(BigInt) }],
    });
  });
});
