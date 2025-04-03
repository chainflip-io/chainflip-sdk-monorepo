import { arbitrumIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/arbitrumIngressEgress/transactionRejectedByBroker';
import { bitcoinIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/bitcoinIngressEgress/transactionRejectedByBroker';
import { ethereumIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/ethereumIngressEgress/transactionRejectedByBroker';
import { polkadotIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/polkadotIngressEgress/transactionRejectedByBroker';
import { solanaIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/solanaIngressEgress/transactionRejectedByBroker';
import { assethubIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/190/assethubIngressEgress/transactionRejectedByBroker';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import z from 'zod';
import { EventHandlerArgs } from '..';
import logger from '../../utils/logger';
import { getDepositTxRef } from '../common';

const schemaMap = {
  Arbitrum: arbitrumIngressEgressTransactionRejectedByBroker,
  Bitcoin: bitcoinIngressEgressTransactionRejectedByBroker,
  Ethereum: ethereumIngressEgressTransactionRejectedByBroker,
  Polkadot: polkadotIngressEgressTransactionRejectedByBroker,
  Solana: solanaIngressEgressTransactionRejectedByBroker.transform(({ broadcastId }) => ({
    broadcastId,
    txId: undefined,
  })),
  Assethub: assethubIngressEgressTransactionRejectedByBroker,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type TransactionRejectedByBrokerArgs = z.input<(typeof schemaMap)[ChainflipChain]>;

export const transactionRejectedByBroker =
  (chain: ChainflipChain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { broadcastId, ...rest } = schemaMap[chain].parse(event.args);
    const txRef = getDepositTxRef(chain, rest.txId);

    if (!txRef) {
      logger.warn('failed to find txRef for rejected tx', {
        block: block.height,
        index: event.indexInBlock,
      });
      return;
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        nativeId: broadcastId,
        chain,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });

    await prisma.failedSwap.updateMany({
      where: { depositTransactionRef: txRef },
      data: { refundBroadcastId: broadcast.id },
    });
  };

export default transactionRejectedByBroker;
