import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../../client.js';
import { broadcastSuccessMock } from '../../__tests__/utils.js';
import broadcastSuccess from '../broadcastSuccess.js';

describe(broadcastSuccess, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Broadcast" CASCADE`;
  });

  it('updates an existing broadcast with the tx_ref for ethereum', async () => {
    const chain = 'Ethereum';
    const { block, event } = broadcastSuccessMock(chain, {
      transactionOutId: {
        kTimesGAddress: '0x',
        s: '0x',
      },
      transactionRef: '0x1234',
    });

    await prisma.broadcast.create({
      data: {
        chain,
        nativeId: event.args.broadcastId as number,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height - 1}-1`,
      },
    });

    await prisma.$transaction((tx) =>
      broadcastSuccess(chain)({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const broadcast = await prisma.broadcast.findFirstOrThrow({
      where: { nativeId: event.args.broadcastId as number },
    });

    expect(broadcast).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('updates an existing broadcast with the tx_ref for polkadot', async () => {
    const chain = 'Assethub';
    const { block, event } = broadcastSuccessMock(chain, {
      transactionOutId: '0x',
      transactionRef: {
        blockNumber: 100,
        extrinsicIndex: 21,
      },
    });

    await prisma.broadcast.create({
      data: {
        chain,
        nativeId: event.args.broadcastId as number,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height - 1}-1`,
      },
    });

    await prisma.$transaction((tx) =>
      broadcastSuccess(chain)({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const broadcast = await prisma.broadcast.findFirstOrThrow({
      where: { nativeId: event.args.broadcastId as number },
    });

    expect(broadcast).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(broadcast.transactionRef?.split('-').length).toBe(2);
  });

  it('updates an existing broadcast with the tx_ref for bitcoin', async () => {
    const chain = 'Bitcoin';
    const { block, event } = broadcastSuccessMock(chain, {
      transactionOutId: '0x',
      transactionRef: '0x5a6571d73cd1760fc659f9f845252d2a3b275a0d1a0b5db91ed9dc29b2283092',
    });

    await prisma.broadcast.create({
      data: {
        chain,
        nativeId: event.args.broadcastId as number,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height - 1}-1`,
      },
    });

    await prisma.$transaction((tx) =>
      broadcastSuccess(chain)({
        block: block as any,
        event: event as any,
        prisma: tx,
      }),
    );

    const broadcast = await prisma.broadcast.findFirstOrThrow({
      where: { nativeId: event.args.broadcastId as number },
    });

    expect(broadcast).toMatchSnapshot({
      id: expect.any(BigInt),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });
});
