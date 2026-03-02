import { arbitrumIngressEgressCcmBroadcastRequested } from '@chainflip/processor/190/arbitrumIngressEgress/ccmBroadcastRequested';
import { assethubIngressEgressCcmBroadcastRequested } from '@chainflip/processor/190/assethubIngressEgress/ccmBroadcastRequested';
import { bitcoinIngressEgressCcmBroadcastRequested } from '@chainflip/processor/190/bitcoinIngressEgress/ccmBroadcastRequested';
import { ethereumIngressEgressCcmBroadcastRequested } from '@chainflip/processor/190/ethereumIngressEgress/ccmBroadcastRequested';
import { solanaIngressEgressCcmBroadcastRequested } from '@chainflip/processor/190/solanaIngressEgress/ccmBroadcastRequested';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import logger from '../../utils/logger.js';
import type { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: arbitrumIngressEgressCcmBroadcastRequested,
  Assethub: assethubIngressEgressCcmBroadcastRequested,
  Bitcoin: bitcoinIngressEgressCcmBroadcastRequested,
  Ethereum: ethereumIngressEgressCcmBroadcastRequested,
  Solana: solanaIngressEgressCcmBroadcastRequested,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type CcmBroadcastRequestedArgsMap = {
  [chain in ChainflipChain]: z.input<(typeof schemas)[chain]>;
};

const ccmBroadcastRequested =
  (chain: ChainflipChain) =>
  async ({ event, prisma, block }: EventHandlerArgs) => {
    const {
      broadcastId,
      egressId: [, nativeId],
    } = schemas[chain].parse(event.args);

    const egresses = await prisma.egress.findMany({
      where: { chain, nativeId },
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

export default ccmBroadcastRequested;
