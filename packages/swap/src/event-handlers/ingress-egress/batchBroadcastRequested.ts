import { arbitrumIngressEgressBatchBroadcastRequested } from '@chainflip/processor/190/arbitrumIngressEgress/batchBroadcastRequested';
import { assethubIngressEgressBatchBroadcastRequested } from '@chainflip/processor/190/assethubIngressEgress/batchBroadcastRequested';
import { bitcoinIngressEgressBatchBroadcastRequested } from '@chainflip/processor/190/bitcoinIngressEgress/batchBroadcastRequested';
import { ethereumIngressEgressBatchBroadcastRequested } from '@chainflip/processor/190/ethereumIngressEgress/batchBroadcastRequested';
import { solanaIngressEgressBatchBroadcastRequested } from '@chainflip/processor/190/solanaIngressEgress/batchBroadcastRequested';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import z from 'zod';
import logger from '../../utils/logger.js';
import type { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: arbitrumIngressEgressBatchBroadcastRequested,
  Bitcoin: bitcoinIngressEgressBatchBroadcastRequested,
  Ethereum: ethereumIngressEgressBatchBroadcastRequested,
  Solana: solanaIngressEgressBatchBroadcastRequested,
  Assethub: assethubIngressEgressBatchBroadcastRequested,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type BatchBroadcastRequestedArgsMap = {
  [chain in ChainflipChain]: z.input<(typeof schemas)[chain]>;
};

/**
 * this event emits a list of egress ids and a new broadcast id to track the
 * egress. the broadcast success event will be emitted with this id when all
 * of the egresses are successful
 */
const batchBroadcastRequested =
  (chain: ChainflipChain) =>
  async ({ prisma, block, event }: EventHandlerArgs): Promise<void> => {
    const { broadcastId, egressIds } = schemas[chain].parse(event.args);

    if (egressIds.length === 0) {
      logger.info('no egress ids, skipping', { broadcastId });
      return;
    }

    const egresses = await prisma.egress.findMany({
      where: {
        chain,
        nativeId: { in: egressIds.map(([, id]) => id) },
      },
    });

    if (egresses.length === 0) {
      logger.info('no egresses found, skipping', { broadcastId });
      return;
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        chain,
        nativeId: broadcastId,
        requestedAt: new Date(block.timestamp),
        requestedBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });

    await prisma.egress.updateMany({
      where: {
        id: { in: egresses.map((egress) => egress.id) },
      },
      data: { broadcastId: broadcast.id },
    });
  };

export default batchBroadcastRequested;
