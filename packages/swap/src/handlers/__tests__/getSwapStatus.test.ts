/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TRPCError } from '@trpc/server';
import { Chains } from '@/shared/enums';
import prisma from '../../client';
import {
  createDepositChannel,
  createEgress,
  createSwap,
} from '../../event-handlers/__tests__/utils';
import { appRouter } from '../../server';

const findChannel = async () =>
  prisma.swapDepositChannel.findUnique({
    where: {
      issuedBlock_srcChain_channelId: {
        issuedBlock: 1001,
        srcChain: 'Ethereum',
        channelId: 1001n,
      },
    },
  });

const createExecutedSwap = (id: bigint) =>
  createSwap({
    swapDepositChannelId: id,
    swapExecutedAt: new Date(1690559052834),
    swapExecutedBlockIndex: '100',
  });

const createEgressScheduled = (nativeId: bigint, swapId: bigint) =>
  createEgress({
    nativeId,
    chain: Chains.Bitcoin,
    amount: '10000000',
    scheduledAt: new Date(1690559052840),
    scheduledBlockIndex: '100',
    swaps: {
      connect: {
        id: swapId,
      },
    },
  });

const createBroadcastRequested = (nativeId: bigint, egressId: bigint) =>
  prisma.broadcast.create({
    data: {
      nativeId,
      chain: Chains.Bitcoin,
      requestedAt: new Date(1690559052841),
      requestedBlockIndex: '100',
      egresses: {
        connect: {
          id: egressId,
        },
      },
    },
  });

describe('getSwapStatus', () => {
  const caller = appRouter.createCaller({});

  describe('input validations', () => {
    it('should fail when provided a wrong format string', async () => {
      try {
        await caller.getStatus({
          id: 'dfkfajfdlsk',
        });
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).toBe('BAD_REQUEST');
        } else {
          expect(true).toBe(false);
        }
      }
    });
    it('should not fail with bad request when input is right', async () => {
      try {
        await caller.getStatus({
          id: '1-Ethereum-1',
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.code).not.toBe('BAD_REQUEST');
        } else {
          expect(true).toBe(false);
        }
      }
    });
  });
  describe('output validations', () => {
    beforeAll(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE public."SwapDepositChannel" CASCADE`;
      await createDepositChannel({
        channelId: 1001n,
        srcChain: 'Ethereum',
        issuedBlock: 1001,
      });
    });
    beforeEach(async () => {
      await prisma.$queryRaw`TRUNCATE TABLE public."Swap" CASCADE`;
      await prisma.$queryRaw`TRUNCATE TABLE public."Egress" CASCADE`;
      await prisma.$queryRaw`TRUNCATE TABLE public."Broadcast" CASCADE`;
    });

    it('should return AWAITING_DEPOSIT state when depositChannel is created is not found', async () => {
      const status = await caller.getStatus({
        id: '1001-Ethereum-1001',
      });
      expect(status.state).toBe('AWAITING_DEPOSIT');
    });

    it('should return DEPOSIT_RECEIVED state when swap object is found', async () => {
      const channel = await findChannel();
      await createSwap({
        swapDepositChannelId: channel!.id,
      });
      const status = await caller.getStatus({
        id: '1001-Ethereum-1001',
      });

      expect(status.state).toBe('DEPOSIT_RECEIVED');
    });

    it('should return SWAP_EXECUTED state when executed', async () => {
      const channel = await findChannel();
      await createExecutedSwap(channel!.id);
      const status = await caller.getStatus({
        id: '1001-Ethereum-1001',
      });

      expect(status.state).toBe('SWAP_EXECUTED');
      if ('swapExecutedAt' in status) {
        expect(status.swapExecutedAt).toBe(1690559052834);
        expect(status.swapExecutedBlockIndex).toBe('100');
      } else {
        expect(true).toBe(false);
      }
    });

    it('should return EGRESS_SCHEDULED state when egress found', async () => {
      const channel = await findChannel();
      const swap = await createExecutedSwap(channel!.id);
      await createEgressScheduled(swap.nativeId, swap.id);

      const status = await caller.getStatus({
        id: '1001-Ethereum-1001',
      });

      expect(status.state).toBe('EGRESS_SCHEDULED');
      if ('egressScheduledAt' in status) {
        expect(status.egressScheduledAt).toBe(1690559052840);
        expect(status.egressScheduledBlockIndex).toBe('100');
      } else {
        expect(true).toBe(false);
      }
    });

    it('should return BROADCAST_REQUESTED state when broadcast found', async () => {
      const channel = await findChannel();
      const swap = await createExecutedSwap(channel!.id);
      const egress = await createEgressScheduled(swap.nativeId, swap.id);
      await createBroadcastRequested(swap.nativeId, egress.id);

      const status = await caller.getStatus({
        id: '1001-Ethereum-1001',
      });

      expect(status.state).toBe('BROADCAST_REQUESTED');
      if ('broadcastRequestedAt' in status) {
        expect(status.broadcastRequestedAt).toBe(1690559052841);
        expect(status.broadcastRequestedBlockIndex).toBe('100');
      } else {
        expect(true).toBe(false);
      }
    });

    it('should return BROADCAST_ABORTED state when broadcast aborted found', async () => {
      const channel = await findChannel();
      const swap = await createExecutedSwap(channel!.id);
      const egress = await createEgressScheduled(swap.nativeId, swap.id);
      const broadcast = await createBroadcastRequested(
        swap.nativeId,
        egress.id,
      );
      await prisma.broadcast.update({
        where: {
          id: broadcast.id,
        },
        data: {
          abortedAt: new Date(1690559052843),
          abortedBlockIndex: '101',
        },
      });

      const status = await caller.getStatus({
        id: '1001-Ethereum-1001',
      });

      expect(status.state).toBe('BROADCAST_ABORTED');
      if ('broadcastAbortedAt' in status) {
        expect(status.broadcastAbortedAt).toBe(1690559052843);
        expect(status.broadcastAbortedBlockIndex).toBe('101');
      } else {
        expect(true).toBe(false);
      }
    });

    it('should return COMPLETE state when broadcast succeeded found', async () => {
      const channel = await findChannel();
      const swap = await createExecutedSwap(channel!.id);
      const egress = await createEgressScheduled(swap.nativeId, swap.id);
      const broadcast = await createBroadcastRequested(
        swap.nativeId,
        egress.id,
      );
      await prisma.broadcast.update({
        where: {
          id: broadcast.id,
        },
        data: {
          succeededAt: new Date(1690559052846),
          succeededBlockIndex: '102',
        },
      });

      const status = await caller.getStatus({
        id: '1001-Ethereum-1001',
      });

      expect(status.state).toBe('COMPLETE');
      if ('broadcastSucceededAt' in status) {
        expect(status.broadcastSucceededAt).toBe(1690559052846);
        expect(status.broadcastSucceededBlockIndex).toBe('102');
      } else {
        expect(true).toBe(false);
      }
    });

    it('should fail output validation when aborted and succeeded are present', async () => {
      const channel = await findChannel();
      const swap = await createExecutedSwap(channel!.id);
      const egress = await createEgressScheduled(swap.nativeId, swap.id);
      const broadcast = await createBroadcastRequested(
        swap.nativeId,
        egress.id,
      );
      await prisma.broadcast.update({
        where: {
          id: broadcast.id,
        },
        data: {
          succeededAt: new Date(1690559052846),
          abortedAt: new Date(1690559052846),
        },
      });

      try {
        await caller.getStatus({
          id: '1001-Ethereum-1001',
        });
        expect(true).toBe(false);
      } catch (error) {
        if (error instanceof TRPCError) {
          expect(error.message).toContain('Output validation failed');
        } else {
          expect(true).toBe(false);
        }
      }
    });
  });
});
