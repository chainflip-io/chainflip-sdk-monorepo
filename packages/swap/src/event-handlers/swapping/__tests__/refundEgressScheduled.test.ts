import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client';
import { DOT_ADDRESS, refundEgressScheduledMock } from '../../__tests__/utils';
import refundEgressScheduled from '../refundEgressScheduled';

describe(refundEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "SwapRequest" CASCADE`;
  });

  it('creates egress for refund on an existing swap', async () => {
    const { event, block } = refundEgressScheduledMock;
    const swapId = BigInt(event.args.swapRequestId);

    await prisma.swapRequest.create({
      data: {
        nativeId: swapId,
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'Dot',
        destAddress: DOT_ADDRESS,
        requestType: 'LEGACY_SWAP',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        totalBrokerCommissionBps: 0,
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
