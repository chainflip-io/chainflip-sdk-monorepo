import { assethubIngressEgressTransferFallbackRequested as assethub190 } from '@chainflip/processor/190/assethubIngressEgress/transferFallbackRequested';
import { bitcoinIngressEgressTransferFallbackRequested as bitcoin190 } from '@chainflip/processor/190/bitcoinIngressEgress/transferFallbackRequested';
import { arbitrumIngressEgressTransferFallbackRequested as arbitrum210 } from '@chainflip/processor/210/arbitrumIngressEgress/transferFallbackRequested';
import { ethereumIngressEgressTransferFallbackRequested as ethereum210 } from '@chainflip/processor/210/ethereumIngressEgress/transferFallbackRequested';
import { solanaIngressEgressTransferFallbackRequested as solana210 } from '@chainflip/processor/210/solanaIngressEgress/transferFallbackRequested';
import { tronIngressEgressTransferFallbackRequested as tron220 } from '@chainflip/processor/220/tronIngressEgress/transferFallbackRequested';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import logger from '../../utils/logger.js';
import { formatForeignChainAddress } from '../common.js';
import { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: arbitrum210.strict().transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Arb',
      value: args.destinationAddress,
    }),
  })),
  Bitcoin: bitcoin190.transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Btc',
      value: args.destinationAddress,
    }),
  })),
  Ethereum: ethereum210.strict().transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Eth',
      value: args.destinationAddress,
    }),
  })),
  Solana: solana210.strict().transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Sol',
      value: args.destinationAddress,
    }),
  })),
  Assethub: assethub190.transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Hub',
      value: args.destinationAddress,
    }),
  })),
  Tron: tron220.transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Tron',
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
