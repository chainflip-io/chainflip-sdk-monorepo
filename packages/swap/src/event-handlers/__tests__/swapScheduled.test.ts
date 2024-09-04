import prisma from '../../client';
import swapScheduled, { SwapScheduled150Args } from '../swapScheduled';

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

  describe('spec 1.5.0', () => {
    it('creates a swap request and swap', async () => {
      const args: SwapScheduled150Args = {
        swapId: '2',
        depositAmount: '100000000',
        destinationAddress: {
          __kind: 'Eth',
          value: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        },
        destinationAsset: { __kind: 'Flip' },
        sourceAsset: { __kind: 'Btc' },
        swapType: {
          __kind: 'Swap',
          value: {
            __kind: 'Eth',
            value: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
          },
        },
        origin: {
          __kind: 'Vault',
          txHash: '0x1234',
        },
        executeAt: 58,
        brokerFee: '1000000',
      };

      await swapScheduled({
        prisma,
        block: {
          hash: '0x123',
          height: 42,
          timestamp: new Date('2024-08-23 13:10:06.000+00'),
          specId: 'test@150',
        },
        event: {
          name: 'Swapping.SwapScheduled',
          indexInBlock: 42,
          args,
        },
      });

      expect(
        await prisma.swapRequest.findFirstOrThrow({
          include: { swaps: { include: { fees: true } }, fees: true },
        }),
      ).toMatchSnapshot({
        id: expect.any(BigInt),
        fees: [
          {
            id: expect.any(BigInt),
            swapRequestId: expect.any(BigInt),
          },
        ],
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
});
