import { createBtcSwapDepositChannel } from './utils';
import prisma from '../../../client';
import { insufficientBoostLiquidity } from '../insufficientBoostLiquidity';

export const insufficientBoostLiquidityMock = ({
  amountAttempted,
  channelId,
}: {
  amountAttempted?: string;
  channelId?: string;
}) =>
  ({
    block: {
      height: 120,
      timestamp: 1670337105000,
    },
    eventContext: {
      kind: 'event',
      event: {
        args: {
          prewitnessedDepositId: '1',
          asset: {
            __kind: 'Btc',
          },
          amountAttempted: amountAttempted ?? '1000000',
          channelId: channelId ?? '1',
        },
        name: 'BitcoinIngressEgress.InsufficientBoostLiquidity',
        indexInBlock: 7,
      },
    },
  }) as const;

describe('insufficientBoostLiquidity', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "private"."DepositChannel" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "FailedBoost" CASCADE`;
  });

  it('creates a failed boost record linked to the swap deposit channel', async () => {
    const swapDepositChannel = await createBtcSwapDepositChannel({});
    const eventData = insufficientBoostLiquidityMock({
      amountAttempted: '1000000',
      channelId: swapDepositChannel.channelId.toString(),
    }) as any;
    const event = eventData.eventContext.event as any;
    const block = eventData.block as any;

    await prisma.$transaction(async (txClient) => {
      await insufficientBoostLiquidity({
        prisma: txClient,
        event,
        block,
      });
    });

    const channel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: { id: swapDepositChannel.id },
      include: { failedBoosts: true },
    });
    expect(channel.failedBoosts).toHaveLength(1);
    expect(channel.failedBoosts).toMatchSnapshot([
      {
        swapDepositChannelId: expect.any(BigInt),
        failedAtTimestamp: expect.any(Date),
        failedAtBlockIndex: expect.any(String),
      },
    ]);
  });
});
