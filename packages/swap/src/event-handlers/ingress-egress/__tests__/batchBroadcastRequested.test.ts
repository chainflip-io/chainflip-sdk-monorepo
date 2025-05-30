import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { batchBroadcastRequestedMock } from '../../__tests__/utils.js';
import batchBroadcastRequested from '../batchBroadcastRequested.js';

describe(batchBroadcastRequested, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast" CASCADE`;
  });

  it('creates a broadcast entity and updates the relevant egress entities', async () => {
    const { block, event } = batchBroadcastRequestedMock;

    await prisma.egress.create({
      data: {
        chain: event.args.egressIds[0][0].__kind,
        nativeId: BigInt(event.args.egressIds[0][1]),
        amount: '123456789',
        scheduledAt: new Date(block.timestamp),
        scheduledBlockIndex: `${block.height - 1}-1`,
      },
    });
    await prisma.egress.create({
      data: {
        chain: event.args.egressIds[0][0].__kind,
        nativeId: BigInt(event.args.egressIds[1][1]),
        amount: '987654321',
        scheduledAt: new Date(block.timestamp),
        scheduledBlockIndex: `${block.height - 1}-2`,
      },
    });

    await prisma.$transaction((tx) =>
      batchBroadcastRequested('Ethereum')({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const broadcast = await prisma.broadcast.findFirstOrThrow({
      where: { nativeId: event.args.broadcastId },
      include: {
        egresses: {
          select: {
            nativeId: true,
            chain: true,
            amount: true,
          },
        },
      },
    });

    expect(broadcast).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('does not create a broadcast entity if egresses are not tracked', async () => {
    const { block, event } = batchBroadcastRequestedMock;

    await prisma.$transaction((tx) =>
      batchBroadcastRequested('Ethereum')({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const broadcast = await prisma.broadcast.findFirst({
      where: { nativeId: event.args.broadcastId },
    });

    expect(broadcast).toBeFalsy();
  });
});
