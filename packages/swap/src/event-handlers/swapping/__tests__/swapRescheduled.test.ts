import { describe, it, expect, beforeEach } from 'vitest';
import prisma, { SwapDepositChannel } from '../../../client.js';
import { createDepositChannel } from '../../__tests__/utils.js';
import swapRescheduled, { SwapRescheduledArgs } from '../swapRescheduled.js';

describe(swapRescheduled, () => {
  let btcSwapDepositChannel: SwapDepositChannel;

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;

    btcSwapDepositChannel = await createDepositChannel({
      srcChain: 'Bitcoin',
      srcAsset: 'Btc',
      destAsset: 'Eth',
      depositAddress: 'bcrt1pzjdpc799qa5f7m65hpr66880res5ac3lr6y2chc4jsa',
      destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
      isExpired: true,
    });

    const request = await prisma.swapRequest.create({
      data: {
        nativeId: 3,
        srcAsset: 'Btc',
        destAsset: 'Eth',
        destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
        swapDepositChannelId: btcSwapDepositChannel.id,
        depositAmount: '100000000',
        swapInputAmount: '100000000',
        depositFinalisedAt: new Date('2024-08-06T00:00:00.000Z'),
        depositFinalisedBlockIndex: '1-1',
        originType: 'DEPOSIT_CHANNEL',
        requestType: 'REGULAR',
        swapRequestedAt: new Date('2024-08-06T00:00:00.000Z'),
        swapRequestedBlockIndex: '1-1',
        totalBrokerCommissionBps: 0,
      },
    });

    await prisma.swap.create({
      data: {
        nativeId: 3,
        swapRequestId: request.id,
        srcAsset: 'Btc',
        destAsset: 'Eth',
        type: 'SWAP',
        swapInputAmount: '990000000',
        swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
        swapScheduledBlockIndex: '1-1',
      },
    });
  });

  it('increments the retry count', async () => {
    const args: SwapRescheduledArgs = {
      swapId: '3',
      executeAt: 100,
    };

    await swapRescheduled({
      prisma,
      block: {
        height: 10,
        specId: 'test@150',
        timestamp: '2024-08-06T00:00:06.000Z',
        hash: '0x123',
      },
      event: { args, name: 'Swapping.SwapRescheduled', indexInBlock: 7 },
    });

    const swap = await prisma.swap.findUniqueOrThrow({
      where: { nativeId: 3 },
    });
    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapRequestId: expect.any(BigInt),
    });
  });

  it('sets the rescheduled reason', async () => {
    const args: SwapRescheduledArgs = {
      swapId: '3',
      executeAt: 100,
      reason: {
        __kind: 'PriceImpactLimit',
      },
    };

    await swapRescheduled({
      prisma,
      block: {
        height: 10,
        specId: 'test@150',
        timestamp: '2024-08-06T00:00:06.000Z',
        hash: '0x123',
      },
      event: { args, name: 'Swapping.SwapRescheduled', indexInBlock: 7 },
    });

    const swap = await prisma.swap.findUniqueOrThrow({
      where: { nativeId: 3 },
    });
    expect(swap.latestSwapRescheduledReason).toBe('PriceImpactLimit');
    expect(swap.swapAbortedReason).toBeNull();
    expect(swap.swapAbortedAt).toBeNull();
  });
});
