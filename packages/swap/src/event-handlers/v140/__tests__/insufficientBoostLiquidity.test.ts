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
    const event = eventData.event as any;
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
        id: expect.any(Number),
        swapDepositChannelId: expect.any(BigInt),
        failedAtTimestamp: expect.any(Date),
        failedAtBlockIndex: expect.any(String),
      },
    ]);
  });

  it('does nothing when no swap deposit channel was found', async () => {
    await prisma.depositChannel.create({
      data: {
        srcChain: 'Bitcoin',
        depositAddress: 'tb1pdz3akc5wa2gr69v3x87tfg0ka597dxqvfl6zhqx4y202y63cgw0q3rgpm6',
        channelId: 1n,
        issuedBlock: 0,
        isSwapping: false,
      },
    });
    const eventData = insufficientBoostLiquidityMock({
      amountAttempted: '1000000',
      channelId: '1',
    }) as any;
    const event = eventData.event as any;
    const block = eventData.block as any;

    await prisma.$transaction(async (txClient) => {
      await insufficientBoostLiquidity({
        prisma: txClient,
        event,
        block,
      });
    });

    await expect(prisma.failedBoost.count()).resolves.toBe(0);
  });

  it('asserts that a channel exist', async () => {
    const eventData = insufficientBoostLiquidityMock({
      amountAttempted: '1000000',
      channelId: '1',
    }) as any;
    const event = eventData.event as any;
    const block = eventData.block as any;

    await prisma.$transaction(async (txClient) => {
      await expect(
        insufficientBoostLiquidity({
          prisma: txClient,
          event,
          block,
        }),
      ).rejects.toThrow(
        `InsufficientBoostLiquidity: Deposit channel not found for asset Btc and channelId 1`,
      );
    });

    const channel = await prisma.swapDepositChannel.findFirst({
      where: { id: 1 },
    });

    expect(channel).toBeNull();
  });
});
