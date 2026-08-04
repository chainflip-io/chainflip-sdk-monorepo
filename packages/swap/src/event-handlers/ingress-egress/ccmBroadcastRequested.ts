import { arbitrumIngressEgressCcmBroadcastRequested as arbitrumSchema220 } from '@chainflip/processor/220/arbitrumIngressEgress/ccmBroadcastRequested';
import { assethubIngressEgressCcmBroadcastRequested as assethubSchema220 } from '@chainflip/processor/220/assethubIngressEgress/ccmBroadcastRequested';
import { bitcoinIngressEgressCcmBroadcastRequested as bitcoinSchema220 } from '@chainflip/processor/220/bitcoinIngressEgress/ccmBroadcastRequested';
import { ethereumIngressEgressCcmBroadcastRequested as ethereumSchema220 } from '@chainflip/processor/220/ethereumIngressEgress/ccmBroadcastRequested';
import { solanaIngressEgressCcmBroadcastRequested as solanaSchema220 } from '@chainflip/processor/220/solanaIngressEgress/ccmBroadcastRequested';
import { tronIngressEgressCcmBroadcastRequested as tronSchema220 } from '@chainflip/processor/220/tronIngressEgress/ccmBroadcastRequested';
import { arbitrumIngressEgressCcmBroadcastRequested as arbitrumSchema230 } from '@chainflip/processor/230/arbitrumIngressEgress/ccmBroadcastRequested';
import { assethubIngressEgressCcmBroadcastRequested as assethubSchema230 } from '@chainflip/processor/230/assethubIngressEgress/ccmBroadcastRequested';
import { bitcoinIngressEgressCcmBroadcastRequested as bitcoinSchema230 } from '@chainflip/processor/230/bitcoinIngressEgress/ccmBroadcastRequested';
import { bscIngressEgressCcmBroadcastRequested as bscSchema230 } from '@chainflip/processor/230/bscIngressEgress/ccmBroadcastRequested';
import { ethereumIngressEgressCcmBroadcastRequested as ethereumSchema230 } from '@chainflip/processor/230/ethereumIngressEgress/ccmBroadcastRequested';
import { solanaIngressEgressCcmBroadcastRequested as solanaSchema230 } from '@chainflip/processor/230/solanaIngressEgress/ccmBroadcastRequested';
import { tronIngressEgressCcmBroadcastRequested as tronSchema230 } from '@chainflip/processor/230/tronIngressEgress/ccmBroadcastRequested';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import logger from '../../utils/logger.js';
import type { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: z.union([arbitrumSchema230, arbitrumSchema220]),
  Assethub: z.union([assethubSchema230, assethubSchema220]),
  Bitcoin: z.union([bitcoinSchema230, bitcoinSchema220]),
  Ethereum: z.union([ethereumSchema230, ethereumSchema220]),
  Solana: z.union([solanaSchema230, solanaSchema220]),
  Tron: z.union([tronSchema230, tronSchema220]),
  Bsc: bscSchema230,
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
