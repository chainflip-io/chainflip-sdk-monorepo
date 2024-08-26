import { DOT_ADDRESS, swapEgressScheduledMock } from './utils';
import prisma from '../../client';
import refundEgressScheduled from '../refundEgressScheduled';

const { event, block } = swapEgressScheduledMock;

describe(refundEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress" CASCADE`;
  });

  it('creates egress for refund on an existing swap', async () => {
    const swapId = BigInt(event.args.swapId);

    // store a new swap intent to initiate a new swap
    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(swapId),
        depositAmount: '10000000000',
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

    refundEgressScheduled({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      where: { nativeId: swapId },
      include: {
        refundEgress: { select: { amount: true, scheduledAt: true, chain: true } },
        fees: { select: { amount: true, asset: true, type: true } },
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
      refundEgressId: expect.any(BigInt),
    });
  });
});
