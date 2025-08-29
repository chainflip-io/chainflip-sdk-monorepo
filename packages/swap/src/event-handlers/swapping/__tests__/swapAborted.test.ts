import { baseChainflipAssets } from '@chainflip/utils/chainflip';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import prisma from '../../../client.js';
import swapAborted from '../swapAborted.js';

describe(swapAborted, () => {
  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
    await prisma.pool.createMany({
      data: baseChainflipAssets.map((asset) => ({
        baseAsset: asset,
        quoteAsset: 'Usdc',
        liquidityFeeHundredthPips: 1000,
      })),
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;
  });

  it('handles swap cancellation', async () => {
    const swap = await prisma.swap.create({
      data: {
        nativeId: BigInt('612'),
        swapScheduledAt: new Date('2024-08-23 13:14:06.000+00'),
        srcAsset: 'Usdc',
        destAsset: 'Flip',
        type: 'SWAP',
        swapInputAmount: '250000000000000000000',
        swapScheduledBlockIndex: '123-456',
        swapRequest: {
          create: {
            nativeId: 1n,
            originType: 'VAULT',
            srcAsset: 'Usdc',
            destAsset: 'Flip',
            depositAmount: '250000000000000000000',
            swapInputAmount: '250000000000000000000',
            swapRequestedAt: new Date('2024-08-23 13:14:06.000+00'),
            swapRequestedBlockIndex: '1-1',
            requestType: 'REGULAR',
            totalBrokerCommissionBps: 0,
          },
        },
      },
    });

    expect({
      swapAbortedAt: swap.swapAbortedAt,
      swapAbortedBlockIndex: swap.swapAbortedBlockIndex,
      swapExecutedAt: swap.swapExecutedAt,
    }).toMatchSnapshot({
      swapAbortedAt: null,
      swapAbortedBlockIndex: null,
      swapExecutedAt: null,
    });

    await swapAborted({
      prisma,
      block: {
        hash: '0x123',
        height: 42,
        timestamp: new Date('2024-08-23 13:10:06.000+00'),
        specId: 'test@160',
      },
      event: {
        name: 'Swapping.SwapAborted',
        indexInBlock: 42,
        args: { swapId: '612', reason: { __kind: 'MinPriceViolation' } },
      },
    });

    const updatedSwap = await prisma.swap.findUniqueOrThrow({
      where: { id: swap.id },
    });

    expect({
      swapAbortedAt: updatedSwap.swapAbortedAt,
      swapAbortedBlockIndex: updatedSwap.swapAbortedBlockIndex,
      swapExecutedAt: updatedSwap.swapExecutedAt,
      swapAbortedReason: updatedSwap.swapAbortedReason,
    }).toMatchSnapshot({
      swapAbortedAt: expect.any(Date),
      swapAbortedBlockIndex: expect.any(String),
      swapExecutedAt: null,
    });
  });
});
