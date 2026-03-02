import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { check, DOT_ADDRESS, refundEgressScheduledMock } from '../../__tests__/utils.js';
import refundEgressScheduled, { RefundEgressScheduledArgs } from '../refundEgressScheduled.js';

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
        destAsset: 'HubDot',
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
      },
    });
  });
  it('calculates the refund fee', async () => {
    const { event, block } = refundEgressScheduledMock;
    const swapId = BigInt(event.args.swapRequestId);

    await prisma.swapRequest.create({
      data: {
        nativeId: swapId,
        depositAmount: '10000000000',
        swapInputAmount: '9500000000',
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
        swaps: {
          create: {
            srcAsset: 'Eth',
            destAsset: 'HubDot',
            swapScheduledAt: new Date(block.timestamp - 30000),
            swapScheduledBlockIndex: `${block.height - 90}-${event.indexInBlock}`,
            nativeId: BigInt(1),
            type: 'SWAP',
            swapExecutedAt: new Date(block.timestamp - 12000),
            swapExecutedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
            swapInputAmount: '9000000000',
            swapOutputAmount: '10000000000',
          },
        },
      },
    });

    await refundEgressScheduled({
      block,
      event: {
        ...event,
        args: check<RefundEgressScheduledArgs>({
          swapRequestId: '9876545',
          egressFee: ['1000', { __kind: 'Eth' }],
          refundFee: '2658298',
          asset: { __kind: 'Eth' },
          amount: '400000000',
          egressId: [{ __kind: 'Ethereum' }, '1'] as const,
        }),
      },
      prisma,
    });

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
      },
    });
  });
});
