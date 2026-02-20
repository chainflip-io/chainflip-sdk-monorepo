import { solanaIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/11200/solanaIngressEgress/transactionRejectedByBroker';
import { arbitrumIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/arbitrumIngressEgress/transactionRejectedByBroker';
import { bitcoinIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/bitcoinIngressEgress/transactionRejectedByBroker';
import { ethereumIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/ethereumIngressEgress/transactionRejectedByBroker';
import { assethubIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/190/assethubIngressEgress/transactionRejectedByBroker';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import assert from 'assert';
import z from 'zod';
import { assertUnreachable } from '@/shared/functions.js';
import { Prisma } from '../../client.js';
import logger from '../../utils/logger.js';
import { getDepositTxRef } from '../common.js';
import { EventHandlerArgs } from '../index.js';

const schemaMap = {
  Arbitrum: arbitrumIngressEgressTransactionRejectedByBroker.transform((args) => ({
    ...args,
    txId: { chain: 'Arbitrum' as const, data: args.txId },
  })),
  Bitcoin: bitcoinIngressEgressTransactionRejectedByBroker.transform((args) => ({
    ...args,
    txId: { chain: 'Bitcoin' as const, data: args.txId },
  })),
  Ethereum: ethereumIngressEgressTransactionRejectedByBroker.transform((args) => ({
    ...args,
    txId: { chain: 'Ethereum' as const, data: args.txId },
  })),
  Solana: solanaIngressEgressTransactionRejectedByBroker.transform((args) => ({
    ...args,
    txId: { chain: 'Solana' as const, data: args.txId },
  })),
  Assethub: assethubIngressEgressTransactionRejectedByBroker.transform((args) => ({
    ...args,
    txId: { chain: 'Assethub' as const, data: args.txId },
  })),
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type TransactionRejectedByBrokerArgs = z.input<(typeof schemaMap)[ChainflipChain]>;

const transactionRejectedByBroker =
  (chain: ChainflipChain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { broadcastId, txId } = schemaMap[chain].parse(event.args);
    const txRef = getDepositTxRef(txId);

    if (!txRef && txId.chain !== 'Solana') {
      logger.warn('failed to find txRef for rejected tx', {
        block: block.height,
        index: event.indexInBlock,
      });
      return;
    }

    let solanaChannel;
    let failedVaultSwap;
    if (txId.chain === 'Solana') {
      if (txId.data.__kind === 'Channel') {
        solanaChannel = await prisma.depositChannel.findFirst({
          where: {
            depositAddress: base58.encode(hexToBytes(txId.data.value)),
          },
          orderBy: { issuedBlock: 'desc' },
        });
        assert(solanaChannel, 'could not find solana channel for failed deposit');
      } else if (txId.data.__kind === 'VaultSwapAccount') {
        const depositAddress = base58.encode(hexToBytes(txId.data.value[0]));
        const solanaPendingTxRef = await prisma.solanaPendingTxRef.findFirst({
          where: {
            slot: txId.data.value[1],
            address: depositAddress,
          },
          include: {
            failedVaultSwap: true,
          },
        });
        failedVaultSwap = solanaPendingTxRef?.failedVaultSwap;
        if (!failedVaultSwap) {
          throw new Error(
            `could not find failed vault deposit for rejected solana deposit ${depositAddress} slot ${txId.data.value[1]}`,
          );
        }
      } else {
        assertUnreachable(txId.data, 'unexpected txId.data.__kind');
      }
    }

    const orConditions = [
      txRef && { depositTransactionRef: txRef },
      solanaChannel && { swapDepositChannel: { channelId: solanaChannel.channelId } },
      failedVaultSwap && { id: failedVaultSwap.id },
    ].filter(Boolean) as Prisma.FailedSwapWhereInput[];

    assert(orConditions.length, 'No failedDeposit condition found to update');
    assert(
      orConditions.length === 1,
      'Expected only one failed deposit udpate condition to be present',
    );

    const broadcast = await prisma.broadcast.create({
      data: {
        nativeId: broadcastId,
        chain,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });

    await prisma.failedSwap.updateMany({
      where: {
        OR: orConditions,
        refundBroadcastId: null,
      },
      data: {
        refundBroadcastId: broadcast.id,
      },
    });
  };

export default transactionRejectedByBroker;
