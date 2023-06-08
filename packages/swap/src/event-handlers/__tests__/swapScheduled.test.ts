import prisma, { SwapDepositChannel } from '../../client';
import swapScheduled from '../swapScheduled';
import {
  createDepositChannel,
  swapScheduledDepositChannelMock,
  swapScheduledVaultMock,
} from './utils';

describe(swapScheduled, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap" CASCADE`;
  });

  describe('deposit channel origin', () => {
    let swapDepositChannel: SwapDepositChannel;

    beforeEach(async () => {
      swapDepositChannel = await createDepositChannel({
        srcAsset:
          swapScheduledDepositChannelMock.eventContext.event.args.sourceAsset
            .__kind,
        destAsset:
          swapScheduledDepositChannelMock.eventContext.event.args
            .destinationAsset.__kind,
        depositAddress:
          swapScheduledDepositChannelMock.eventContext.event.args.origin
            .depositAddress.value,
        destAddress:
          swapScheduledDepositChannelMock.eventContext.event.args
            .destinationAddress.value,
      });
    });

    it('stores a new swap from a deposit channel', async () => {
      await prisma.$transaction(async (client) => {
        await swapScheduled({
          prisma: client,
          block: swapScheduledDepositChannelMock.block as any,
          event: swapScheduledDepositChannelMock.eventContext.event as any,
        });
      });

      const swap = await prisma.swap.findFirstOrThrow({
        where: { swapDepositChannelId: swapDepositChannel.id },
      });

      expect(swap.depositAmount.toString()).toEqual(
        swapScheduledDepositChannelMock.eventContext.event.args.depositAmount,
      );
      expect(swap).toMatchSnapshot({
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        swapDepositChannelId: expect.any(BigInt),
      });
    });

    it('does not store a new swap if the deposit channel is expired', async () => {
      await prisma.swapDepositChannel.update({
        where: { id: swapDepositChannel.id },
        data: { expiryBlock: -1 },
      });

      await prisma.$transaction(async (client) => {
        await swapScheduled({
          prisma: client,
          block: swapScheduledDepositChannelMock.block,
          event: swapScheduledDepositChannelMock.eventContext.event as any,
        });
      });

      expect(await prisma.swap.findFirst()).toBeNull();
    });

    it('does not store a new swap if the deposit channel is not found', async () => {
      await prisma.swapDepositChannel.update({
        where: { id: swapDepositChannel.id },
        data: { depositAddress: '0x0' },
      });

      await prisma.$transaction(async (client) => {
        await swapScheduled({
          prisma: client,
          block: swapScheduledDepositChannelMock.block,
          event: swapScheduledDepositChannelMock.eventContext.event as any,
        });
      });

      expect(await prisma.swap.findFirst()).toBeNull();
    });

    it('does not store a new swap if the deposit channel is not unique', async () => {
      const { id, uuid, ...rest } = swapDepositChannel;

      await prisma.swapDepositChannel.create({ data: rest });

      await expect(
        prisma.$transaction(async (client) => {
          await swapScheduled({
            prisma: client,
            block: swapScheduledDepositChannelMock.block,
            event: swapScheduledDepositChannelMock.eventContext.event as any,
          });
        }),
      ).rejects.toThrowError();

      expect(await prisma.swap.findFirst()).toBeNull();
    });
  });

  describe('smart contract origin', () => {
    it('stores a new swap from a contract deposit', async () => {
      // create a swap after receiving the event
      await prisma.$transaction(async (client) => {
        await swapScheduled({
          prisma: client,
          block: swapScheduledVaultMock.block as any,
          event: swapScheduledVaultMock.eventContext.event as any,
        });
      });

      const swap = await prisma.swap.findFirstOrThrow();

      expect(swap.depositAmount.toString()).toEqual(
        swapScheduledVaultMock.eventContext.event.args.depositAmount,
      );
      expect(swap).toMatchSnapshot({
        id: expect.any(BigInt),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});
