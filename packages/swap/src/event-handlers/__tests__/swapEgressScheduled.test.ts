import { DOT_ADDRESS, swapEgressScheduledMock } from './utils';
import prisma from '../../client';
import swapEgressScheduled from '../swapEgressScheduled';

const { event, block } = swapEgressScheduledMock;

describe(swapEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "SwapRequest" CASCADE`;
  });

  it('adds an egress and fee to a swap request', async () => {
    const swapId = BigInt(event.args.swapId);

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

    await swapEgressScheduled({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      where: { nativeId: swapId },
      include: {
        egress: true,
        fees: { select: { amount: true, asset: true, type: true } },
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
      egressId: expect.any(BigInt),
      egress: {
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
  });
});
