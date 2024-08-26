import { InternalAssets } from '@/shared/enums';
import { DOT_ADDRESS, createDepositChannel, swapEgressScheduledMock } from './utils';
import prisma from '../../client';
import refundEgressScheduled from '../refundEgressScheduled';

const { event, block } = swapEgressScheduledMock;

describe(refundEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress" CASCADE`;
  });

  it('creates egress for refund on an existing swap', async () => {
    const { swapId } = event.args;

    // store a new swap intent to initiate a new swap
    const swapDepositChannel = await createDepositChannel({
      swaps: {
        create: {
          nativeId: BigInt(swapId),
          depositAmount: '10000000000',
          swapInputAmount: '10000000000',
          swapOutputAmount: '10000000000',
          depositReceivedAt: new Date(block.timestamp - 12000),
          depositReceivedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
          swapExecutedAt: new Date(block.timestamp - 6000),
          swapExecutedBlockIndex: `${block.height}-${event.indexInBlock}`,
          srcAsset: InternalAssets.Eth,
          destAsset: InternalAssets.Dot,
          destAddress: DOT_ADDRESS,
          type: 'SWAP',
          swapScheduledAt: new Date(Date.now() - 12000),
          swapScheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
        },
      },
    });

    await prisma.$transaction((tx) =>
      refundEgressScheduled({
        block: block as any,
        event: {
          ...event,
          args: {
            asset: {
              __kind: 'Eth',
            },
            swapId: '9876545',
            egressId: [{ __kind: 'Ethereum' }, '1'] as const,
            egressFee: '0x123',
            amount: '0x1234567890',
          },
        },
        prisma: tx,
      }),
    );

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: {
        refundEgress: {
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
      refundEgressId: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      swapScheduledAt: expect.any(Date),
      fees: [{ id: expect.any(BigInt), swapId: expect.any(BigInt) }],
    });
  });
});
