import { arbitrumIngressEgressDepositFinalised } from '@chainflip/processor/180/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised } from '@chainflip/processor/180/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised } from '@chainflip/processor/180/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised } from '@chainflip/processor/180/polkadotIngressEgress/depositFinalised';
import { assethubIngressEgressDepositFinalised } from '@chainflip/processor/190/assethubIngressEgress/depositFinalised';
import { ChainflipChain } from '@chainflip/utils/chainflip';
// @ts-expect-error should still work
import { Metadata, TypeRegistry } from '@polkadot/types';
import assert from 'assert';
import { z } from 'zod';
import { formatTxRef } from '@/shared/common';
import { CacheMap } from '@/shared/dataStructures';
import { assertUnreachable } from '@/shared/functions';
import { chainEnum, unsignedInteger } from '@/shared/parsers';
import * as rpc from '@/shared/rpc';
import { Prisma } from '../client';
import env from '../config/env';
import type { EventHandlerArgs } from '.';

export const egressId = z.tuple([chainEnum, unsignedInteger]);

const metadataCache = new CacheMap<string, Metadata>(60_000 * 60);

const getMetadata = async (block: EventHandlerArgs['block']) => {
  let metadata = metadataCache.get(block.specId);

  if (!metadata) {
    const metadataString = await rpc.getMetadata({ rpcUrl: env.RPC_NODE_HTTP_URL }, block.hash);
    const registry = new TypeRegistry();
    metadata = new Metadata(registry, metadataString);
    registry.setMetadata(metadata);

    metadataCache.set(block.specId, metadata);
  }

  return metadata;
};

export const parseSpecNumber = (specId: string) => {
  const [, numberString] = specId.split('@');
  const number = Number.parseInt(numberString, 10);
  assert(Number.isSafeInteger(number), `Invalid spec id: ${specId}`);
  return number;
};

export const getStateChainError = async (
  prisma: Prisma.TransactionClient,
  block: EventHandlerArgs['block'],
  value: { error: `0x${string}`; index: number },
) => {
  // convert LE hex encoded number (e.g. "0x06000000") to number (6)
  const errorIndex = Buffer.from(value.error.slice(2), 'hex').readUint32LE();
  const specVersion = parseSpecNumber(block.specId);
  const palletIndex = value.index;

  const failureReason = await prisma.stateChainError.findUnique({
    where: {
      specVersion_palletIndex_errorIndex: {
        specVersion,
        palletIndex,
        errorIndex,
      },
    },
  });

  if (failureReason) return failureReason;

  const metadata = await getMetadata(block);

  const registryError = metadata.registry.findMetaError(new Uint8Array([palletIndex, errorIndex]));

  return prisma.stateChainError.create({
    data: {
      specVersion,
      palletIndex,
      errorIndex,
      name: `${registryError.section}.${registryError.name}`,
      docs: registryError.docs.join('\n').trim(),
    },
  });
};

export type DepositDetailsData = {
  [C in ChainflipChain]: {
    chain: C;
    data: {
      Bitcoin: z.output<typeof bitcoinIngressEgressDepositFinalised>;
      Ethereum: z.output<typeof ethereumIngressEgressDepositFinalised>;
      Polkadot: z.output<typeof polkadotIngressEgressDepositFinalised>;
      Arbitrum: z.output<typeof arbitrumIngressEgressDepositFinalised>;
      Solana: { depositDetails: undefined };
      Assethub: z.output<typeof assethubIngressEgressDepositFinalised>;
    }[C]['depositDetails'];
  };
}[ChainflipChain];

export const getDepositTxRef = (
  depositDetails: DepositDetailsData,
  blockHeight?: bigint | number,
) => {
  if (depositDetails === undefined) {
    return undefined;
  }

  switch (depositDetails.chain) {
    case 'Arbitrum':
    case 'Ethereum': {
      const hash = depositDetails.data?.txHashes?.at(0);
      if (!hash) return undefined;
      return formatTxRef({ chain: depositDetails.chain, data: hash });
    }
    case 'Bitcoin':
      return formatTxRef({ chain: depositDetails.chain, data: depositDetails.data.id.txId });
    case 'Assethub':
    case 'Polkadot':
      if (blockHeight === undefined) return undefined;
      return formatTxRef({
        chain: depositDetails.chain,
        data: { blockNumber: Number(blockHeight), extrinsicIndex: depositDetails.data },
      });

    case 'Solana':
      assert(depositDetails == null);
      return undefined;
    default:
      return assertUnreachable(depositDetails);
  }
};
