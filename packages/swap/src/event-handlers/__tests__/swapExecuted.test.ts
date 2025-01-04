import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { InternalAssets } from '@/shared/enums';
import prisma from '../../client';
import swapExecuted, { SwapExecutedArgs } from '../swapExecuted';

vi.mock('@/shared/consts', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    getPoolsNetworkFeeHundredthPips: vi.fn().mockReturnValue(1000),
  };
});

const solArgs: SwapExecutedArgs = {
  swapId: '641',
  brokerFee: '0',
  inputAsset: { __kind: 'Flip' },
  networkFee: '1975480',
  inputAmount: '250000000000000000000',
  outputAsset: { __kind: 'Sol' },
  outputAmount: '21502501808',
  swapRequestId: '457',
  intermediateAmount: '1973504362',
} as const;

const usdcArgs: SwapExecutedArgs = {
  swapId: '612',
  brokerFee: '10000',
  inputAsset: { __kind: 'Flip' },
  networkFee: '2117824',
  inputAmount: '250000000000000000000',
  outputAsset: { __kind: 'Usdc' },
  outputAmount: '2115705684',
  swapRequestId: '489',
} as const;

const runEvent = async (args: SwapExecutedArgs) => {
  const swap = await prisma.swap.create({
    data: {
      nativeId: BigInt(args.swapId),
      swapScheduledAt: new Date('2024-08-23 13:14:06.000+00'),
      srcAsset: args.inputAsset.__kind,
      destAsset: args.outputAsset.__kind,
      type: 'SWAP',
      swapInputAmount: args.inputAmount,
      swapScheduledBlockIndex: '123-456',
      swapRequest: {
        create: {
          nativeId: 1n,
          originType: 'VAULT',
          srcAsset: args.inputAsset.__kind,
          destAsset: args.outputAsset.__kind,
          depositAmount: args.inputAmount,
          swapInputAmount: args.inputAmount,
          swapRequestedAt: new Date('2024-08-23 13:14:06.000+00'),
          requestType: 'REGULAR',
        },
      },
    },
  });

  await swapExecuted({
    block: {
      height: 123,
      hash: '0x123',
      timestamp: '2024-08-23 13:14:06.000+00',
      specId: 'test@150',
    },
    event: {
      name: 'Swapping.SwapExecuted',
      args,
      indexInBlock: 0,
    },
    prisma,
  });

  return prisma.swap.findUniqueOrThrow({
    where: { id: swap.id },
    include: { fees: { select: { amount: true, asset: true, type: true } } },
  });
};

describe(swapExecuted, () => {
  beforeAll(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE public."Pool" CASCADE`;
    await prisma.pool.createMany({
      data: Object.values(InternalAssets).map((asset) => ({
        baseAsset: asset,
        quoteAsset: 'Usdc',
        liquidityFeeHundredthPips: 1000,
      })),
    });
  });

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;
  });

  it('updates an existing swap', async () => {
    const swap = await runEvent(usdcArgs);

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapRequestId: expect.any(BigInt),
    });
  });

  it('updates an existing swap with intermediate amount', async () => {
    const swap = await runEvent(solArgs);

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapRequestId: expect.any(BigInt),
    });
  });
});
