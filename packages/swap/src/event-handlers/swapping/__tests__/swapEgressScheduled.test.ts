import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { DOT_ADDRESS, swapEgressScheduledMock } from '../../__tests__/utils.js';
import swapEgressScheduled from '../swapEgressScheduled.js';

const { event, block } = swapEgressScheduledMock;

describe(swapEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "SwapRequest" CASCADE`;
  });

  it('adds an egress and fee to a swap request', async () => {
    const swapRequestId = BigInt(event.args.swapRequestId);

    await prisma.swapRequest.create({
      data: {
        nativeId: swapRequestId,
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'HubDot',
        destAddress: DOT_ADDRESS,
        requestType: 'LEGACY_SWAP',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        totalBrokerCommissionBps: 0,
      },
    });

    await swapEgressScheduled({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      where: { nativeId: swapRequestId },
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
      },
    });
  });
});
