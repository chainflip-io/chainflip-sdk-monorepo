import { describe, it, expect, beforeEach } from 'vitest';
import { DOT_ADDRESS, ETH_ADDRESS, swapEgressScheduledMock } from './utils';
import prisma from '../../client';
import swapEgressScheduled from '../swapEgressScheduled';

const { event, block } = swapEgressScheduledMock;

describe(swapEgressScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Egress", "SwapRequest" CASCADE`;
  });

  it('adds an egress and fee to a swap request for 160 schema', async () => {
    const swapRequestId = BigInt(event.args.swapRequestId);

    await prisma.swapRequest.create({
      data: {
        nativeId: swapRequestId,
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

    await swapEgressScheduled({
      block,
      event: {
        ...event,
        args: {
          dispatchInfo: {
            class: [null],
            weight: '101978000',
            paysFee: [null],
          },
          swapId: '9876545',
          swapRequestId: '9876545',
          fee: '1000000000',
          egressFee: '1000000000',
          asset: { __kind: 'Eth' },
          amount: '10000000000',
          egressId: [{ __kind: 'Ethereum' }, '1'] as const,
        },
      },
      prisma,
    });

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
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
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
        destAsset: 'Dot',
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
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
    });
  });

  it('uses gas asset for egress fee when CCM for 160 schema', async () => {
    const ccmEvent = {
      ...event,
      args: {
        swapRequestId: '9876545',
        fee: '1000000000',
        egressFee: '1000000000',
        amount: '10000000000',
        asset: { __kind: 'ArbUsdc' },
        egressId: [{ __kind: 'Arbitrum' }, '1'] as const,
      },
    };

    const swapRequestId = BigInt(ccmEvent.args.swapRequestId);

    await prisma.swapRequest.create({
      data: {
        nativeId: swapRequestId,
        depositAmount: '1000000',
        swapInputAmount: '1000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${ccmEvent.indexInBlock}`,
        srcAsset: 'ArbUsdc',
        destAsset: 'ArbUsdc',
        destAddress: ETH_ADDRESS,
        requestType: 'CCM',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        totalBrokerCommissionBps: 0,
      },
    });

    await swapEgressScheduled({ block, event: ccmEvent, prisma });

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
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      fees: [
        {
          asset: 'ArbEth',
          type: 'EGRESS',
        },
      ],
    });
  });
});
