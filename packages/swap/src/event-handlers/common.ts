import * as bitcoin from '@chainflip/bitcoin';
import { arbitrumIngressEgressDepositFinalised } from '@chainflip/processor/11200/arbitrumIngressEgress/depositFinalised';
import { assethubIngressEgressDepositFinalised } from '@chainflip/processor/11200/assethubIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised } from '@chainflip/processor/11200/bitcoinIngressEgress/depositFinalised';
import { cfChainsAddressForeignChainAddress } from '@chainflip/processor/11200/common';
import { ethereumIngressEgressDepositFinalised } from '@chainflip/processor/11200/ethereumIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised } from '@chainflip/processor/11200/solanaIngressEgress/depositFinalised';
import * as base58 from '@chainflip/utils/base58';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { POLKADOT_SS58_PREFIX } from '@chainflip/utils/consts';
import * as ss58 from '@chainflip/utils/ss58';
import { Metadata, TypeRegistry } from '@polkadot/types';
import assert from 'assert';
import { z } from 'zod';
import { formatTxRef } from '@/shared/common.js';
import { CacheMap } from '@/shared/dataStructures.js';
import { assertUnreachable } from '@/shared/functions.js';
import * as rpc from '@/shared/rpc/index.js';
import { Prisma } from '../client.js';
import env from '../config/env.js';
import type { EventHandlerArgs } from './index.js';

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
      Arbitrum: z.output<typeof arbitrumIngressEgressDepositFinalised>;
      Solana: z.output<typeof solanaIngressEgressDepositFinalised> | { depositDetails: undefined };
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
      if (blockHeight === undefined) return undefined;
      return formatTxRef({
        chain: depositDetails.chain,
        data: { blockNumber: Number(blockHeight), extrinsicIndex: depositDetails.data },
      });
    case 'Solana':
      return undefined;
    default:
      return assertUnreachable(depositDetails);
  }
};

type ForeignChainAddress = z.output<typeof cfChainsAddressForeignChainAddress>;

export const formatForeignChainAddress = (address: ForeignChainAddress): string => {
  switch (address.__kind) {
    case 'Eth':
    case 'Arb':
      return address.value;
    case 'Sol':
      return base58.encode(address.value);
    case 'Hub':
    case 'Dot':
      return ss58.encode({ data: address.value, ss58Format: POLKADOT_SS58_PREFIX });
    case 'Btc':
      if (address.value.__kind === 'OtherSegwit') {
        throw new Error('OtherSegwit scriptPubKey not supported');
      }

      return bitcoin.encodeAddress(
        address.value.value,
        address.value.__kind,
        env.CHAINFLIP_NETWORK,
      );
    default:
      return assertUnreachable(address, 'unexpected address');
  }
};
