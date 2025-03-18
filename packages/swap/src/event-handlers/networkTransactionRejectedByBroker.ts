import { arbitrumIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/arbitrumIngressEgress/transactionRejectedByBroker';
import { bitcoinIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/bitcoinIngressEgress/transactionRejectedByBroker';
import { ethereumIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/ethereumIngressEgress/transactionRejectedByBroker';
import { polkadotIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/polkadotIngressEgress/transactionRejectedByBroker';
import { solanaIngressEgressTransactionRejectedByBroker } from '@chainflip/processor/170/solanaIngressEgress/transactionRejectedByBroker';
import { Chain } from '../client';
import { getDepositTxRef } from './common';
import logger from '../utils/logger';
import { EventHandlerArgs } from '.';

const schemaMap = {
  Arbitrum: arbitrumIngressEgressTransactionRejectedByBroker,
  Bitcoin: bitcoinIngressEgressTransactionRejectedByBroker,
  Ethereum: ethereumIngressEgressTransactionRejectedByBroker,
  Polkadot: polkadotIngressEgressTransactionRejectedByBroker,
  Solana: solanaIngressEgressTransactionRejectedByBroker.transform(({ broadcastId }) => ({
    broadcastId,
    txId: undefined,
  })),
};

export const networkTransactionRejectedByBroker =
  (chain: Chain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    // TODO(1.9): handle assethub
    if (chain === 'Assethub') return;
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

export default networkTransactionRejectedByBroker;
