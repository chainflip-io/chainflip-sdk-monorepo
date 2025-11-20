import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import { describe, it, expect, beforeEach } from 'vitest';
import { formatTxRef } from '@/shared/common.js';
import prisma from '../../../client.js';
import transactionRejectedByBroker from '../transactionRejectedByBroker.js';

describe(transactionRejectedByBroker, () => {
  beforeEach(async () => {
    await prisma.$queryRaw`TRUNCATE TABLE "Egress", "Broadcast", "FailedSwap", "SwapDepositChannel", private."DepositChannel", private."SolanaPendingTxRef" CASCADE`;
  });

  it('adds a broadcast to a failed swap', async () => {
    const timestamp = 1680337105000;

    const args = {
      txId: {
        id: {
          txId: '0x78b3828e63d9300eedcfeaed28e7416764019a62066b945e63624ac27dc5cc9d' as const,
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
        depositTransactionRef: formatTxRef({ chain: 'Bitcoin', data: args.txId.id.txId }),
      },
    });

    await transactionRejectedByBroker('Bitcoin')({
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

  it('adds a broadcast to a rejected solana swap channel', async () => {
    const depositAddressHex = '0xff43ffabbdb1fb60ac34485803affa14d75331b9262da90632e2aea14fe1590a';
    const solanaDepositAddress = base58.encode(hexToBytes(depositAddressHex));
    const timestamp = 1680337105000;

    const swapChannel = await prisma.swapDepositChannel.create({
      data: {
        channelId: 105n,
        srcChain: 'Solana',
        srcAsset: 'Sol',
        depositAddress: solanaDepositAddress,
        destAsset: 'Eth',
        destAddress: '0x928369aaf229795542bbdfc35811223c6d69cab6',
        issuedBlock: 100,
        totalBrokerCommissionBps: 0,
        maxBoostFeeBps: 0,
        openingFeePaid: 0,
      },
    });

    await prisma.depositChannel.create({
      data: {
        channelId: swapChannel.channelId,
        srcChain: 'Solana',
        depositAddress: solanaDepositAddress,
        issuedBlock: swapChannel.issuedBlock,
        isSwapping: true,
        type: 'SWAP',
      },
    });

    const failedSwap = await prisma.failedSwap.create({
      data: {
        depositAmount: '10000000',
        srcAsset: 'Sol',
        srcChain: 'Solana',
        destChain: 'Ethereum',
        destAddress: '0x928369aaf229795542bbdfc35811223c6d69cab6',
        destAsset: 'Eth',
        reason: 'TransactionRejectedByBroker',
        failedAt: new Date(timestamp - 6000),
        failedBlockIndex: '419-1',
        swapDepositChannelId: swapChannel.id,
      },
    });

    const args = {
      txId: {
        value: depositAddressHex,
        __kind: 'Channel' as const,
      },
      broadcastId: 2929,
    };

    await transactionRejectedByBroker('Solana')({
      block: { specId: 'test@170', height: 420, timestamp } as any,
      event: { indexInBlock: 1, args } as any,
      prisma,
    });

    const broadcast = await prisma.broadcast.findUniqueOrThrow({
      where: {
        nativeId_chain: { nativeId: args.broadcastId, chain: 'Solana' },
      },
    });

    const updatedFailedSwap = await prisma.failedSwap.findUniqueOrThrow({
      where: { id: failedSwap.id },
      include: { refundBroadcast: true },
    });

    expect(updatedFailedSwap.refundBroadcastId).toBe(broadcast.id);
    expect(updatedFailedSwap.refundBroadcast).toMatchObject({
      id: broadcast.id,
      nativeId: BigInt(args.broadcastId),
      chain: 'Solana',
    });
  });

  it('adds a broadcast to a rejected solana vault swap account', async () => {
    const depositAddressHex = '0xa21608917ae1e13c14b6f476d9c119e619e4d429272a0a32812835ec00f509fd';
    const slotStr = '417878605';
    const timestamp = 1680337105000;

    const failedSwap = await prisma.failedSwap.create({
      data: {
        depositAmount: '100000000',
        srcAsset: 'Sol',
        srcChain: 'Solana',
        destChain: 'Ethereum',
        destAddress: '0x928369aaf229795542bbdfc35811223c6d69cab6',
        destAsset: 'Flip',
        reason: 'TransactionRejectedByBroker',
        failedAt: new Date(timestamp - 6000),
        failedBlockIndex: '419-1',
      },
    });

    await prisma.solanaPendingTxRef.create({
      data: {
        address: base58.encode(hexToBytes(depositAddressHex)),
        slot: BigInt(slotStr),
        failedVaultSwapId: failedSwap.id,
      },
    });

    const args = {
      txId: {
        __kind: 'VaultSwapAccount' as const,
        value: [depositAddressHex, slotStr],
      },
      broadcastId: 4001,
    };

    await transactionRejectedByBroker('Solana')({
      block: { specId: 'test@170', height: 420, timestamp } as any,
      event: { indexInBlock: 1, args } as any,
      prisma,
    });

    const broadcast = await prisma.broadcast.findFirstOrThrow({
      where: { nativeId: args.broadcastId, chain: 'Solana' },
    });

    const updatedFailedSwap = await prisma.failedSwap.findUniqueOrThrow({
      where: { id: failedSwap.id },
      include: { refundBroadcast: true },
    });

    expect(updatedFailedSwap.refundBroadcastId).toBe(broadcast.id);
    expect(updatedFailedSwap.refundBroadcast).toMatchObject({
      id: broadcast.id,
      nativeId: BigInt(args.broadcastId),
      chain: 'Solana',
    });
  });
});
