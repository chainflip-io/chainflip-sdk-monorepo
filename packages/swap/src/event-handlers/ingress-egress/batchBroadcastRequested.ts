import { arbitrumIngressEgressBatchBroadcastRequested as arbitrumSchema220 } from '@chainflip/processor/220/arbitrumIngressEgress/batchBroadcastRequested';
import { assethubIngressEgressBatchBroadcastRequested as assethubSchema220 } from '@chainflip/processor/220/assethubIngressEgress/batchBroadcastRequested';
import { bitcoinIngressEgressBatchBroadcastRequested as bitcoinSchema220 } from '@chainflip/processor/220/bitcoinIngressEgress/batchBroadcastRequested';
import { ethereumIngressEgressBatchBroadcastRequested as ethereumSchema220 } from '@chainflip/processor/220/ethereumIngressEgress/batchBroadcastRequested';
import { solanaIngressEgressBatchBroadcastRequested as solanaSchema220 } from '@chainflip/processor/220/solanaIngressEgress/batchBroadcastRequested';
import { tronIngressEgressBatchBroadcastRequested as tronSchema220 } from '@chainflip/processor/220/tronIngressEgress/batchBroadcastRequested';
import { arbitrumIngressEgressBatchBroadcastRequested as arbitrumSchema230 } from '@chainflip/processor/230/arbitrumIngressEgress/batchBroadcastRequested';
import { assethubIngressEgressBatchBroadcastRequested as assethubSchema230 } from '@chainflip/processor/230/assethubIngressEgress/batchBroadcastRequested';
import { bitcoinIngressEgressBatchBroadcastRequested as bitcoinSchema230 } from '@chainflip/processor/230/bitcoinIngressEgress/batchBroadcastRequested';
import { bscIngressEgressBatchBroadcastRequested as bscSchema230 } from '@chainflip/processor/230/bscIngressEgress/batchBroadcastRequested';
import { ethereumIngressEgressBatchBroadcastRequested as ethereumSchema230 } from '@chainflip/processor/230/ethereumIngressEgress/batchBroadcastRequested';
import { solanaIngressEgressBatchBroadcastRequested as solanaSchema230 } from '@chainflip/processor/230/solanaIngressEgress/batchBroadcastRequested';
import { tronIngressEgressBatchBroadcastRequested as tronSchema230 } from '@chainflip/processor/230/tronIngressEgress/batchBroadcastRequested';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import z from 'zod';
import logger from '../../utils/logger.js';
import type { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: z.union([arbitrumSchema230.strict(), arbitrumSchema220.strict()]),
  Bitcoin: z.union([bitcoinSchema230.strict(), bitcoinSchema220.strict()]),
  Ethereum: z.union([ethereumSchema230.strict(), ethereumSchema220.strict()]),
  Solana: z.union([solanaSchema230.strict(), solanaSchema220.strict()]),
  Assethub: z.union([assethubSchema230.strict(), assethubSchema220.strict()]),
  Tron: z.union([tronSchema230.strict(), tronSchema220.strict()]),
  Bsc: bscSchema230.strict(),
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
