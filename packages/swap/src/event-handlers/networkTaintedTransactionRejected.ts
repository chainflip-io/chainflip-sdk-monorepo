import { arbitrumIngressEgressTaintedTransactionRejected } from '@chainflip/processor/170/arbitrumIngressEgress/taintedTransactionRejected';
import { bitcoinIngressEgressTaintedTransactionRejected } from '@chainflip/processor/170/bitcoinIngressEgress/taintedTransactionRejected';
import { ethereumIngressEgressTaintedTransactionRejected } from '@chainflip/processor/170/ethereumIngressEgress/taintedTransactionRejected';
import { polkadotIngressEgressTaintedTransactionRejected } from '@chainflip/processor/170/polkadotIngressEgress/taintedTransactionRejected';
import { solanaIngressEgressTaintedTransactionRejected } from '@chainflip/processor/170/solanaIngressEgress/taintedTransactionRejected';
import { Chain } from '../client';
import { getDepositTxRef } from './common';
import logger from '../utils/logger';
import { EventHandlerArgs } from '.';

const schemaMap = {
  Arbitrum: arbitrumIngressEgressTaintedTransactionRejected,
  Bitcoin: bitcoinIngressEgressTaintedTransactionRejected,
  Ethereum: ethereumIngressEgressTaintedTransactionRejected,
  Polkadot: polkadotIngressEgressTaintedTransactionRejected,
  Solana: solanaIngressEgressTaintedTransactionRejected.transform(({ broadcastId }) => ({
    broadcastId,
    txId: undefined,
  })),
};

export const networkTaintedTransactionRejected =
  (chain: Chain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { broadcastId, ...rest } = schemaMap[chain].parse(event.args);
    const txRef = getDepositTxRef(chain, rest.txId);

    if (!txRef) {
      logger.warn('failed to find txRef for tainted tx', {
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

export default networkTaintedTransactionRejected;
