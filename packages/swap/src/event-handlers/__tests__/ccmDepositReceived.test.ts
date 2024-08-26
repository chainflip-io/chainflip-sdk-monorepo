import prisma from '@/swap/client';
import ccmDepositReceived, { CcmDepositReceivedArgs } from '../ccmDepositReceived';

describe(ccmDepositReceived, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;
  });

  it('updates the CCM fields', async () => {
    const block = {
      timestamp: new Date().toISOString(),
      height: 1000,
      specId: 'test@150',
      hash: '0x123',
    };
    const swapRequest = await prisma.swapRequest.create({
      data: {
        nativeId: 1n,
        originType: 'VAULT',
        requestType: 'LEGACY_SWAP',
        srcAsset: 'Eth',
        destAsset: 'ArbEth',
        destAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        depositAmount: '1000000000000000000',
        swapRequestedAt: new Date('2024-08-23 13:10:06.000+00'),
        ccmGasBudget: null,
        ccmDepositReceivedBlockIndex: null,
        ccmMessage: null,
      },
    });

    const args: CcmDepositReceivedArgs = {
      principalSwapId: swapRequest.nativeId.toString(),
      destinationAddress: {
        __kind: 'Arb',
        value: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
      },
      ccmId: '1',
      depositAmount: '1000000000000000000',
      depositMetadata: {
        channelMetadata: {
          message: '0xcafebabe',
          gasBudget: '65000',
        },
      },
    };

    await ccmDepositReceived({
      prisma,
      block,
      event: {
        args,
        name: 'Swapping.CcmDepositReceived',
        indexInBlock: 6,
      },
    });

    expect(
      await prisma.swapRequest.findUniqueOrThrow({ where: { id: swapRequest.id } }),
    ).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });
});
