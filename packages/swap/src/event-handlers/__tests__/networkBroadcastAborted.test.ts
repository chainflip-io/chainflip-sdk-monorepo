import { describe, it, expect, beforeEach } from 'vitest';
import { networkBroadcastAbortedMock } from './utils';
import prisma from '../../client';
import networkBroadcastAborted from '../networkBroadcastAborted';

describe(networkBroadcastAborted, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap" CASCADE`;
  });

  it('updates an existing broadcast entity with the succeeded timestamp', async () => {
    const { block, event } = networkBroadcastAbortedMock;

    await prisma.broadcast.create({
      data: {
        chain: 'Ethereum',
        nativeId: event.args.broadcastId,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height - 1}-1`,
      },
    });

    await prisma.$transaction((tx) =>
      networkBroadcastAborted('Ethereum')({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const broadcast = await prisma.broadcast.findFirstOrThrow({
      where: { nativeId: event.args.broadcastId },
    });

    expect(broadcast).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });
});
