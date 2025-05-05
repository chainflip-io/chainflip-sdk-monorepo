import { arbitrumIngressEgressTransferFallbackRequested as arbitrum180 } from '@chainflip/processor/180/arbitrumIngressEgress/transferFallbackRequested';
import { bitcoinIngressEgressTransferFallbackRequested as bitcoin180 } from '@chainflip/processor/180/bitcoinIngressEgress/transferFallbackRequested';
import { ethereumIngressEgressTransferFallbackRequested as ethereum180 } from '@chainflip/processor/180/ethereumIngressEgress/transferFallbackRequested';
import { polkadotIngressEgressTransferFallbackRequested as polkadot180 } from '@chainflip/processor/180/polkadotIngressEgress/transferFallbackRequested';
import { solanaIngressEgressTransferFallbackRequested as solana180 } from '@chainflip/processor/180/solanaIngressEgress/transferFallbackRequested';
import { arbitrumIngressEgressTransferFallbackRequested as arbitrum190 } from '@chainflip/processor/190/arbitrumIngressEgress/transferFallbackRequested';
import { assethubIngressEgressTransferFallbackRequested } from '@chainflip/processor/190/assethubIngressEgress/transferFallbackRequested';
import { bitcoinIngressEgressTransferFallbackRequested as bitcoin190 } from '@chainflip/processor/190/bitcoinIngressEgress/transferFallbackRequested';
import { ethereumIngressEgressTransferFallbackRequested as ethereum190 } from '@chainflip/processor/190/ethereumIngressEgress/transferFallbackRequested';
import { polkadotIngressEgressTransferFallbackRequested as polkadot190 } from '@chainflip/processor/190/polkadotIngressEgress/transferFallbackRequested';
import { solanaIngressEgressTransferFallbackRequested as solana190 } from '@chainflip/processor/190/solanaIngressEgress/transferFallbackRequested';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import logger from '../../utils/logger.js';
import { formatForeignChainAddress } from '../common.js';
import { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: z.union([arbitrum190, arbitrum180]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Arb',
      value: args.destinationAddress,
    }),
  })),
  Bitcoin: z.union([bitcoin190, bitcoin180]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Btc',
      value: args.destinationAddress,
    }),
  })),
  Ethereum: z.union([ethereum190, ethereum180]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Eth',
      value: args.destinationAddress,
    }),
  })),
  Polkadot: z.union([polkadot190, polkadot180]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Dot',
      value: args.destinationAddress,
    }),
  })),
  Solana: z.union([solana190, solana180]).transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Sol',
      value: args.destinationAddress,
    }),
  })),
  Assethub: assethubIngressEgressTransferFallbackRequested.transform((args) => ({
    ...args,
    destinationAddress: formatForeignChainAddress({
      __kind: 'Hub',
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
      .egresses({ include: { swapRequests: true } });

    if (egresses?.length !== 1) {
      logger.warn('incorrect numbr of egresses found for transferFallbackRequested', {
        block: block.height,
        indexInBlock: event.indexInBlock,
        name: event.name,
        egressCount: egresses?.length,
      });
      return;
    }

    const [
      {
        swapRequests: [swapRequest],
      },
    ] = egresses;

    await prisma.swapRequest.update({
      where: { id: swapRequest.id },
      data: {
        fallbackEgress: {
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
