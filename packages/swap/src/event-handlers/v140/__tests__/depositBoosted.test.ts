import { z } from 'zod';
import { actionSchema } from '@/shared/parsers';
import { createBtcSwapDepositChannel } from './utils';
import prisma from '../../../client';
import { depositBoosted } from '../depositBoosted';

export const depositBoostedBtcMock = ({
  action,
  amounts,
  channelId,
}: {
  action?: z.input<typeof actionSchema>;
  amounts?: [[number, string]];
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
          asset: {
            __kind: 'Btc',
          },
          amounts: amounts ?? [[5, '1000000']],
          prewitnessedDepositId: '1',
          channelId: channelId ?? '1',
          ingressFee: '1000',
          boostFee: '500',
          action: action ?? { __kind: 'Swap', swapId: '1' },
        },
        name: 'BitcoinIngressEgress.DepositBoosted',
        indexInBlock: 7,
      },
    },
  }) as const;

describe('depositBoosted', () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "private"."DepositChannel" CASCADE`;
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap" CASCADE`;
  });

  it('updates the values for an existing swap', async () => {
    const swapDepositChannel = await createBtcSwapDepositChannel({});
    const eventData = depositBoostedBtcMock({ amounts: [[5, '1000000']] }) as any;
    const event = eventData.eventContext.event as any;
    const block = eventData.block as any;

    await prisma.$transaction(async (txClient) => {
      await depositBoosted({
        prisma: txClient,
        event,
        block,
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: { fees: true },
    });

    expect(swap.depositAmount.toString()).toBe('1000000');
    expect(swap.effectiveBoostFeeBps).toBe(5);

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      fees: [
        { id: expect.any(BigInt), swapId: expect.any(BigInt), type: 'BOOST' },
        { id: expect.any(BigInt), swapId: expect.any(BigInt), type: 'INGRESS' },
      ],
    });
  });

  it('does nothing when the action is not a swap', async () => {
    const swapDepositChannel = await createBtcSwapDepositChannel({});
    const eventData = depositBoostedBtcMock({
      amounts: [[5, '1000000']],
      action: { __kind: 'LiquidityProvision', lpAccount: '0x123' },
    }) as any;
    const event = eventData.eventContext.event as any;
    const block = eventData.block as any;

    await prisma.$transaction(async (txClient) => {
      await depositBoosted({
        prisma: txClient,
        event,
        block,
      });
    });

    const swap = await prisma.swap.findFirstOrThrow({
      where: { swapDepositChannelId: swapDepositChannel.id },
      include: { fees: true },
    });

    expect(swap.effectiveBoostFeeBps).toBeNull();

    expect(swap).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      swapDepositChannelId: expect.any(BigInt),
      fees: [],
    });
  });
});
