import { networkBroadcastSuccessMock } from './utils';
import prisma from '../../client';
import networkBroadcastSuccess from '../networkBroadcastSuccess';

describe(networkBroadcastSuccess, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "SwapDepositChannel", "Swap", "Broadcast" CASCADE`;
  });

  it('updates an existing broadcast entity with the succeeded timestamp', async () => {
    const { block, event } = networkBroadcastSuccessMock();

    await prisma.broadcast.create({
      data: {
        chain: 'Ethereum',
        nativeId: event.args.broadcastId as number,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height - 1}-1`,
      },
    });

    await prisma.$transaction((tx) =>
      networkBroadcastSuccess('Ethereum')({
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

  it('updates an existing broadcast with the tx_ref if it exists', async () => {
    const { block } = networkBroadcastSuccessMock();
    const { event } = networkBroadcastSuccessMock({
      transactionRef: '0x1234',
    });

    await prisma.broadcast.create({
      data: {
        chain: 'Ethereum',
        nativeId: event.args.broadcastId as number,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height - 1}-1`,
      },
    });

    await prisma.$transaction((tx) =>
      networkBroadcastSuccess('Ethereum')({
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
      transactionRef: broadcast.transactionRef,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });

  it('updates an existing broadcast with the tx_ref for polkadot', async () => {
    const { block } = networkBroadcastSuccessMock();
    const { event } = networkBroadcastSuccessMock({
      transactionRef: {
        blockNumber: 100,
        extrinsicIndex: 21,
      },
    });

    await prisma.broadcast.create({
      data: {
        chain: 'Polkadot',
        nativeId: event.args.broadcastId as number,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height - 1}-1`,
      },
    });

    await prisma.$transaction((tx) =>
      networkBroadcastSuccess('Polkadot')({
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
      transactionRef: broadcast.transactionRef,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(broadcast.transactionRef?.split('-').length).toBe(2);
  });

  it('updates an existing broadcast with the tx_ref for bitcoin', async () => {
    const { block } = networkBroadcastSuccessMock();
    const { event } = networkBroadcastSuccessMock({
      transactionRef: '0x5a6571d73cd1760fc659f9f845252d2a3b275a0d1a0b5db91ed9dc29b2283092',
    });

    await prisma.broadcast.create({
      data: {
        chain: 'Bitcoin',
        nativeId: event.args.broadcastId as number,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height - 1}-1`,
      },
    });

    await prisma.$transaction((tx) =>
      networkBroadcastSuccess('Bitcoin')({
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
      transactionRef: broadcast.transactionRef,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
  });
});
