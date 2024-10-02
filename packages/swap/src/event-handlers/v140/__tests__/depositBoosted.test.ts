import prisma from '../../../client';
import { depositBoosted, DepositBoostedArgs } from '../depositBoosted';

export const depositBoostedBtcMock = async ({
  action = { __kind: 'Swap', swapRequestId: '1' },
  amounts,
  channelId,
}: {
  action?: DepositBoostedArgs['action'];
  amounts?: [[number, string]];
  channelId?: string;
} = {}) => {
  const args: DepositBoostedArgs = {
    blockHeight: 120,
    asset: {
      __kind: 'Btc',
    },
    amounts: amounts ?? [[5, '1000000']],
    prewitnessedDepositId: '101',
    channelId: channelId ?? '1',
    ingressFee: '1000',
    boostFee: '500',
    action,
    depositAddress: {
      value: '0x52890cc3438775253262c88df4ab47841581ac04',
      __kind: 'P2PKH',
    },
    depositDetails: {
      txId: '0x626b620f866caa7474598d3a34a752dba98e5c55f1e3de1c310b75ad093b32c7',
      vout: 0,
    },
  };

  if (action.__kind === 'Swap') {
    await prisma.swapRequest.create({
      data: {
        nativeId: BigInt(action.swapRequestId),
        srcAsset: 'Btc',
        destAsset: 'Flip',
        originType: 'VAULT',
        requestType: 'LEGACY_SWAP',
        depositAmount: '1000000',
        swapInputAmount: '1000000',
        swapRequestedAt: new Date('2023-01-01T00:00:00.000Z'),
        swapRequestedBlockIndex: '92-398',
      },
    });
  }

  return {
    block: {
      height: 120,
      timestamp: 1670337105000,
      hash: '0x123',
      specId: 'test@150',
    },
    event: {
      args,
      name: 'BitcoinIngressEgress.DepositBoosted',
      indexInBlock: 7,
    },
  } as const;
};

describe('depositBoosted', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "private"."DepositChannel" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "SwapRequest" CASCADE`;
  });

  it('updates the values for an existing swap', async () => {
    const { event, block } = await depositBoostedBtcMock({ amounts: [[5, '1000000']] });

    await depositBoosted({ prisma, event, block });

    const request = await prisma.swapRequest.findFirstOrThrow({
      include: { fees: { select: { asset: true, amount: true, type: true } } },
    });

    expect(request).toMatchSnapshot({
      id: expect.any(BigInt),
    });
  });
});
