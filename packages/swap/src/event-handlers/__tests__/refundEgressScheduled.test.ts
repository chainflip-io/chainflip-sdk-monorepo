import { DOT_ADDRESS, swapEgressScheduledMock } from './utils';
import prisma from '../../client';
import refundEgressScheduled from '../refundEgressScheduled';

const { event, block } = swapEgressScheduledMock;

describe(refundEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "SwapRequest" CASCADE`;
  });

  it('creates egress for refund on an existing swap', async () => {
    const swapId = BigInt(event.args.swapId);

    await prisma.swapRequest.create({
      data: {
        nativeId: swapId,
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositReceivedAt: new Date(block.timestamp - 12000),
        depositReceivedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'Dot',
        destAddress: DOT_ADDRESS,
        requestType: 'LEGACY_SWAP',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
      },
    });

    await refundEgressScheduled({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findUniqueOrThrow({
      where: { nativeId: swapId },
      include: {
        refundEgress: true,
        fees: { select: { amount: true, asset: true, type: true } },
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
      refundEgressId: expect.any(BigInt),
      refundEgress: {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
  });
});
