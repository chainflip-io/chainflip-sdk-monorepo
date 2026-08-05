import { arbitrumIngressEgressTransferFallbackRequested as arbitrum220 } from '@chainflip/processor/220/arbitrumIngressEgress/transferFallbackRequested';
import { assethubIngressEgressTransferFallbackRequested as assethub220 } from '@chainflip/processor/220/assethubIngressEgress/transferFallbackRequested';
import { bitcoinIngressEgressTransferFallbackRequested as bitcoin220 } from '@chainflip/processor/220/bitcoinIngressEgress/transferFallbackRequested';
import { ethereumIngressEgressTransferFallbackRequested as ethereum220 } from '@chainflip/processor/220/ethereumIngressEgress/transferFallbackRequested';
import { solanaIngressEgressTransferFallbackRequested as solana220 } from '@chainflip/processor/220/solanaIngressEgress/transferFallbackRequested';
import { tronIngressEgressTransferFallbackRequested as tron220 } from '@chainflip/processor/220/tronIngressEgress/transferFallbackRequested';
import { arbitrumIngressEgressTransferFallbackRequested as arbitrum230 } from '@chainflip/processor/230/arbitrumIngressEgress/transferFallbackRequested';
import { assethubIngressEgressTransferFallbackRequested as assethub230 } from '@chainflip/processor/230/assethubIngressEgress/transferFallbackRequested';
import { bitcoinIngressEgressTransferFallbackRequested as bitcoin230 } from '@chainflip/processor/230/bitcoinIngressEgress/transferFallbackRequested';
import { bscIngressEgressTransferFallbackRequested as bsc230 } from '@chainflip/processor/230/bscIngressEgress/transferFallbackRequested';
import { ethereumIngressEgressTransferFallbackRequested as ethereum230 } from '@chainflip/processor/230/ethereumIngressEgress/transferFallbackRequested';
import { solanaIngressEgressTransferFallbackRequested as solana230 } from '@chainflip/processor/230/solanaIngressEgress/transferFallbackRequested';
import { tronIngressEgressTransferFallbackRequested as tron230 } from '@chainflip/processor/230/tronIngressEgress/transferFallbackRequested';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import logger from '../../utils/logger.js';
import { formatForeignChainAddress } from '../common.js';
import { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: z.union([arbitrum230.strict(), arbitrum220.strict()]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Arb',
      value: args.destinationAddress,
    }),
  })),
  Bitcoin: z.union([bitcoin230.strict(), bitcoin220.strict()]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Btc',
      value: args.destinationAddress,
    }),
  })),
  Ethereum: z.union([ethereum230.strict(), ethereum220.strict()]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Eth',
      value: args.destinationAddress,
    }),
  })),
  Solana: z.union([solana230.strict(), solana220.strict()]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Sol',
      value: args.destinationAddress,
    }),
  })),
  Assethub: z.union([assethub230.strict(), assethub220.strict()]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Hub',
      value: args.destinationAddress,
    }),
  })),
  Tron: z.union([tron230.strict(), tron220.strict()]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Tron',
      value: args.destinationAddress,
    }),
  })),
  Bsc: bsc230.strict().transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Bsc',
      value: args.destinationAddress,
    }),
  })),
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type TransferFallbackRequestedArgsMap = {
  [chain in ChainflipChain]: z.input<(typeof schemas)[chain]>;
};

const transferFallbackRequested =
  (chain: ChainflipChain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const args = schemas[chain].parse(event.args);

    if (!args.egressDetails) return;

    const egresses = await prisma.broadcast
      .findUnique({ where: { nativeId_chain: { chain, nativeId: args.broadcastId } } })
      .egresses({ include: { swapRequests: true, refundedSwapRequests: true } });

    if (egresses?.length !== 1) {
      logger.warn('incorrect number of egresses found for transferFallbackRequested', {
        block: block.height,
        indexInBlock: event.indexInBlock,
        name: event.name,
        egressCount: egresses?.length,
      });
      return;
    }

    let swapRequest;
    let refunded = false;
    if (egresses[0].swapRequests[0]) {
      [swapRequest] = egresses[0].swapRequests;
    } else if (egresses[0].refundedSwapRequests[0]) {
      [swapRequest] = egresses[0].refundedSwapRequests;
      refunded = true;
    } else {
      logger.warn('no swap request found for transferFallbackRequested', {
        block: block.height,
        indexInBlock: event.indexInBlock,
        name: event.name,
      });
      return;
    }

    await prisma.swapRequest.update({
      where: { id: swapRequest.id },
      data: {
        [refunded ? 'fallbackRefundEgress' : 'fallbackEgress']: {
          create: {
            nativeId: args.egressDetails.egressId[1],
            chain: args.egressDetails.egressId[0],
            amount: args.egressDetails.egressAmount.toString(),
            scheduledAt: new Date(block.timestamp),
            scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
            fallbackDestinationAddress: args.destinationAddress,
          },
        },
        fees: {
          create: {
            type: 'EGRESS',
            amount: args.egressDetails.feeWithheld.toString(),
            asset: swapRequest.destAsset,
          },
        },
      },
    });
  };

export default transferFallbackRequested;
