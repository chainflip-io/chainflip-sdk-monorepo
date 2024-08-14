import { InternalAssets } from '@/shared/enums';
import { createDepositChannel, swapScheduledBtcDepositChannelMock } from './utils';
import prisma, { SwapDepositChannel } from '../../client';
import swapRescheduled from '../swapRescheduled';

describe(swapRescheduled, () => {
  let btcSwapDepositChannel: SwapDepositChannel;

  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap" CASCADE`;

    btcSwapDepositChannel = await createDepositChannel({
      srcChain: 'Bitcoin',
      srcAsset: InternalAssets.Btc,
      destAsset: InternalAssets.Eth,
      depositAddress: 'bcrt1pzjdpc799qa5f7m65hpr66880res5ac3lr6y2chc4jsa',
      destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
      isExpired: true,
      srcChainExpiryBlock:
        Number(
          swapScheduledBtcDepositChannelMock.eventContext.event.args.origin.depositBlockHeight,
        ) + 1,
    });
    await prisma.swap.create({
      data: {
        nativeId: 3,
        type: 'SWAP',
        srcAsset: InternalAssets.Btc,
        destAsset: InternalAssets.Eth,
        destAddress: '0x41ad2bc63a2059f9b623533d87fe99887d794847',
        swapDepositChannelId: btcSwapDepositChannel.id,
        depositAmount: '100000000',
        swapInputAmount: '990000000',
        depositReceivedAt: new Date('2024-08-06T00:00:00.000Z'),
        depositReceivedBlockIndex: '1-1',
        swapScheduledAt: new Date('2024-08-06T00:00:00.000Z'),
        swapScheduledBlockIndex: '1-1',
      },
    });
  });

  it('handles the event', async () => {
    await swapRescheduled({
      prisma,
      block: { ...swapScheduledBtcDepositChannelMock.block },
      event: {
        ...swapScheduledBtcDepositChannelMock.eventContext.event,
        args: {
          swapId: '3',
          executeAt: swapScheduledBtcDepositChannelMock.block.height + 5,
        },
      },
    });

    const swap = await prisma.swap.findFirstOrThrow({ where: { nativeId: 3 } });
    expect(swap.latestSwapRescheduledAt?.toISOString()).toEqual(
      new Date(swapScheduledBtcDepositChannelMock.block.timestamp).toISOString(),
    );
    expect(swap.latestSwapRescheduledBlockIndex).toEqual(
      `${swapScheduledBtcDepositChannelMock.block.height}-${swapScheduledBtcDepositChannelMock.eventContext.event.indexInBlock}`,
    );
    expect(swap.retryCount).toEqual(1);
  });
});
