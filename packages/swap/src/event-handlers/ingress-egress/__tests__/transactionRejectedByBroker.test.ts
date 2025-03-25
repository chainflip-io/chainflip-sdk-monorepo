import { describe, it, expect, beforeEach } from 'vitest';
import { formatTxRef } from '@/shared/common';
import prisma from '../../../client';
import networkTransactionRejectedByBroker from '../transactionRejectedByBroker';

describe(networkTransactionRejectedByBroker, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "FailedSwap" CASCADE`;
  });

  it('adds a broadcast to a failed swap', async () => {
    const timestamp = 1680337105000;

    const args = {
      txId: {
        id: {
          txId: '0x78b3828e63d9300eedcfeaed28e7416764019a62066b945e63624ac27dc5cc9d',
          vout: 0,
        },
        amount: '1000000',
        depositAddress: {
          pubkeyX: '0xe9adc6fc32ca8e08f9940ffb209dcd775f5f35e20ad69b5c4e225527e9430833',
          scriptPath: {
            salt: 875,
            tapleafHash: '0x4f99f5996889dd9d5332ab2be83e0ce478bb03420dbc8cea7aaaa14e5ef77f86',
            unlockScript: {
              bytes:
                '0x026b037520e9adc6fc32ca8e08f9940ffb209dcd775f5f35e20ad69b5c4e225527e9430833ac',
            },
            tweakedPubkeyBytes:
              '0x03e0c15b4d58f9f1f5cb708addbfc8361f309918d15de0724f70420b3b1944091a',
          },
        },
      },
      broadcastId: 1226,
    };

    await prisma.failedSwap.create({
      data: {
        depositAmount: args.txId.amount,
        srcAsset: 'Btc',
        srcChain: 'Bitcoin',
        destChain: 'Ethereum',
        destAddress: '0xa56A6be23b6Cf39D9448FF6e897C29c41c8fbDFF',
        reason: 'TransactionRejectedByBroker',
        failedAt: new Date(timestamp - 6000),
        failedBlockIndex: '419-1',
        depositTransactionRef: formatTxRef('Bitcoin', args.txId.id.txId),
      },
    });

    await networkTransactionRejectedByBroker('Bitcoin')({
      block: { specId: 'test@170', height: 420, timestamp } as any,
      event: { indexInBlock: 1, args } as any,
      prisma,
    });

    const { id, failedSwaps, createdAt, updatedAt, ...broadcast } =
      await prisma.broadcast.findUniqueOrThrow({
        where: {
          nativeId_chain: { nativeId: args.broadcastId, chain: 'Bitcoin' },
        },
        include: { failedSwaps: true },
      });

    expect(failedSwaps.map(({ id: _, refundBroadcastId, ...rest }) => rest)).toMatchSnapshot();
    expect(broadcast).toMatchSnapshot();
  });
});
