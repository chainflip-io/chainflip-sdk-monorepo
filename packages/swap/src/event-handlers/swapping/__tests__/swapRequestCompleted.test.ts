import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client';
import {
  createDepositChannel,
  DOT_ADDRESS,
  ETH_ADDRESS,
  swapRequestCompletedMock,
} from '../../__tests__/utils';
import swapRequestCompleted from '../swapRequestCompleted';

const { event, block } = swapRequestCompletedMock;

describe(swapRequestCompleted, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;
  });

  it('updates swap request with single swap', async () => {
    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(event.args.swapRequestId),
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'Dot',
        destAddress: DOT_ADDRESS,
        requestType: 'REGULAR',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        swaps: {
          createMany: {
            data: [
              {
                nativeId: 3,
                srcAsset: 'Btc',
                destAsset: 'Eth',
                type: 'SWAP',
                swapInputAmount: '10000000000',
                swapOutputAmount: '2500000',
                swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
                swapScheduledBlockIndex: '1-1',
              },
            ],
          },
        },
        totalBrokerCommissionBps: 0,
      },
    });

    await swapRequestCompleted({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      include: {
        quote: true,
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('updates swap request with multiple swaps', async () => {
    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(event.args.swapRequestId),
        depositAmount: '30000000000',
        swapInputAmount: '30000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'Dot',
        destAddress: DOT_ADDRESS,
        requestType: 'REGULAR',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        swaps: {
          createMany: {
            data: [
              {
                nativeId: 3,
                srcAsset: 'Eth',
                destAsset: 'Dot',
                type: 'SWAP',
                swapInputAmount: '10000000000',
                swapOutputAmount: '2500000',
                swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
                swapScheduledBlockIndex: '1-1',
              },
              {
                nativeId: 4,
                srcAsset: 'Eth',
                destAsset: 'Dot',
                type: 'SWAP',
                swapInputAmount: '10000000000',
                swapOutputAmount: '2500000',
                swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
                swapScheduledBlockIndex: '1-1',
              },
              {
                nativeId: 5,
                srcAsset: 'Eth',
                destAsset: 'Dot',
                type: 'SWAP',
                swapInputAmount: '10000000000',
                swapOutputAmount: '2000000',
                swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
                swapScheduledBlockIndex: '1-1',
              },
            ],
          },
        },
        totalBrokerCommissionBps: 0,
      },
    });

    await swapRequestCompleted({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      include: {
        quote: true,
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });

  it('updates swap request and associated quote', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Ethereum',
      srcAsset: 'Eth',
      depositAddress: ETH_ADDRESS,
      channelId: 99n,
      destAsset: 'Dot',
      destAddress: DOT_ADDRESS,
      quote: {
        create: {
          srcAsset: 'Eth',
          destAsset: 'Dot',
          maxBoostFeeBps: 0,
          expectedDepositAmount: '10000000000',
          quotedEgressAmount: '2000000',
          quotedPrice: '25000',
          channelOpenedAt: new Date(1690556052834),
        },
      },
    });

    await prisma.swapRequest.create({
      data: {
        swapDepositChannelId: channel.id,
        nativeId: BigInt(event.args.swapRequestId),
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'Dot',
        destAddress: DOT_ADDRESS,
        requestType: 'REGULAR',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        swaps: {
          createMany: {
            data: [
              {
                nativeId: 3,
                srcAsset: 'Btc',
                destAsset: 'Eth',
                type: 'SWAP',
                swapInputAmount: '10000000000',
                swapOutputAmount: '2480000',
                swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
                swapScheduledBlockIndex: '1-1',
              },
            ],
          },
        },
        totalBrokerCommissionBps: 0,
      },
    });

    await swapRequestCompleted({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      include: {
        quote: true,
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
      quote: {
        id: expect.any(Number),
        swapDepositChannelId: expect.any(BigInt),
        swapRequestId: expect.any(BigInt),
      },
    });
    expect(swapRequest.quote?.executedPrice).toBeTruthy();
  });

  it('does not update associated quote if deposit amounts do not match', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Ethereum',
      srcAsset: 'Eth',
      depositAddress: ETH_ADDRESS,
      channelId: 99n,
      destAsset: 'Dot',
      destAddress: DOT_ADDRESS,
      quote: {
        create: {
          srcAsset: 'Eth',
          destAsset: 'Dot',
          maxBoostFeeBps: 0,
          expectedDepositAmount: '20000000000',
          quotedEgressAmount: '4000000',
          quotedPrice: '25000',
          channelOpenedAt: new Date(1690556052834),
        },
      },
    });

    await prisma.swapRequest.create({
      data: {
        swapDepositChannelId: channel.id,
        nativeId: BigInt(event.args.swapRequestId),
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'Dot',
        destAddress: DOT_ADDRESS,
        requestType: 'REGULAR',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        swaps: {
          createMany: {
            data: [
              {
                nativeId: 3,
                srcAsset: 'Btc',
                destAsset: 'Eth',
                type: 'SWAP',
                swapInputAmount: '10000000000',
                swapOutputAmount: '2480000',
                swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
                swapScheduledBlockIndex: '1-1',
              },
            ],
          },
        },
        totalBrokerCommissionBps: 0,
      },
    });

    await swapRequestCompleted({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      include: {
        quote: true,
      },
    });

    expect(swapRequest.quote).toBeFalsy();
  });

  it('updates swap request and associated quote if swap was (partially) refunded', async () => {
    const channel = await createDepositChannel({
      id: 100n,
      srcChain: 'Ethereum',
      srcAsset: 'Eth',
      depositAddress: ETH_ADDRESS,
      channelId: 99n,
      destAsset: 'Dot',
      destAddress: DOT_ADDRESS,
      quote: {
        create: {
          srcAsset: 'Eth',
          destAsset: 'Dot',
          maxBoostFeeBps: 0,
          expectedDepositAmount: '10000000000',
          quotedEgressAmount: '2000000',
          quotedPrice: '25000',
          channelOpenedAt: new Date(1690556052834),
        },
      },
    });

    await prisma.swapRequest.create({
      data: {
        swapDepositChannelId: channel.id,
        nativeId: BigInt(event.args.swapRequestId),
        depositAmount: '10000000000',
        swapInputAmount: '10000000000',
        depositFinalisedAt: new Date(block.timestamp - 12000),
        depositFinalisedBlockIndex: `${block.height - 100}-${event.indexInBlock}`,
        srcAsset: 'Eth',
        destAsset: 'Dot',
        destAddress: DOT_ADDRESS,
        requestType: 'REGULAR',
        originType: 'VAULT',
        swapRequestedAt: new Date(block.timestamp - 12000),
        swapRequestedBlockIndex: '92-398',
        swaps: {
          createMany: {
            data: [
              {
                nativeId: 3,
                srcAsset: 'Btc',
                destAsset: 'Eth',
                type: 'SWAP',
                swapInputAmount: '5000000000',
                swapOutputAmount: '1240000',
                swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
                swapScheduledBlockIndex: '1-1',
              },
            ],
          },
        },
        totalBrokerCommissionBps: 0,
      },
    });

    await prisma.swapRequest.update({
      where: { nativeId: BigInt(event.args.swapRequestId) },
      data: {
        refundEgress: {
          create: {
            nativeId: 5,
            chain: 'Ethereum' as const,
            amount: '5000000000',
            scheduledAt: new Date(block.timestamp),
            scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
          },
        },
      },
    });

    await swapRequestCompleted({ block, event, prisma });

    const swapRequest = await prisma.swapRequest.findFirstOrThrow({
      include: {
        quote: true,
      },
    });

    expect(swapRequest).toMatchSnapshot({
      id: expect.any(BigInt),
      refundEgressId: expect.any(BigInt),
      quote: {
        id: expect.any(Number),
        swapDepositChannelId: expect.any(BigInt),
        swapRequestId: expect.any(BigInt),
      },
    });
    expect(swapRequest.quote?.refundedAt).toBeTruthy();
  });
});
