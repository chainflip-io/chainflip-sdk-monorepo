import prisma from '../../client';
import swapScheduled from '../swapScheduled';

describe(swapScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;
  });

  it('creates a swap for a swap request', async () => {
    const requestId = (
      await prisma.swapRequest.create({
        data: {
          srcAsset: 'Btc',
          destAsset: 'Flip',
          nativeId: 12,
          originType: 'VAULT',
          depositAmount: '100000000',
          swapInputAmount: '100000000',
          requestType: 'REGULAR',
          swapRequestedAt: new Date('2024-08-23 13:10:06.000+00'),
        },
      })
    ).id;

    await swapScheduled({
      prisma,
      block: {
        hash: '0x123',
        height: 42,
        timestamp: new Date('2024-08-23 13:10:06.000+00'),
        specId: 'test@160',
      },
      event: {
        name: 'Swapping.SwapScheduled',
        indexInBlock: 42,
        args: {
          swapId: '158',
          swapRequestId: '12',
          inputAmount: '125000000000',
          swapType: { __kind: 'Swap' },
          executeAt: 58,
        },
      },
    });

    const request = await prisma.swapRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { swaps: true },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
      swaps: [
        {
          id: expect.any(BigInt),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          swapRequestId: expect.any(BigInt),
        },
      ],
    });
  });
});
