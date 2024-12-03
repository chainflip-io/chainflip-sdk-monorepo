import { bitcoinIngressEgressDepositFinalised as bitcoinSchema160 } from '@chainflip/processor/160/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised } from '@chainflip/processor/160/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised } from '@chainflip/processor/160/polkadotIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema170 } from '@chainflip/processor/170/bitcoinIngressEgress/depositFinalised';
// @ts-expect-error should still work
import { Metadata, TypeRegistry } from '@polkadot/types';
import assert from 'assert';
import { z } from 'zod';
import { formatTxHash } from '@/shared/common';
import { Chain } from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import {
  btcAddress,
  chainEnum,
  dotAddress,
  ethereumAddress,
  hexString,
  unsignedInteger,
} from '@/shared/parsers';
import * as rpc from '@/shared/rpc';
import { Prisma } from '../client';
import env from '../config/env';
import { CacheMap } from '../utils/dataStructures';
import type { EventHandlerArgs } from '.';

export const egressId = z.tuple([chainEnum, unsignedInteger]);

const ethChainAddress = z
  .object({
    __kind: z.literal('Eth'),
    value: ethereumAddress,
  })
  .transform(({ value }) => ({ chain: 'Ethereum', address: value }) as const);

const dotChainAddress = z
  .object({
    __kind: z.literal('Dot'),
    value: dotAddress,
  })
  .transform(({ value }) => ({ chain: 'Polkadot', address: value }) as const);

const btcChainAddress = z
  .object({
    __kind: z.literal('Btc'),
    value: hexString
      .transform((v) => Buffer.from(v.slice(2), 'hex').toString())
      .pipe(btcAddress(env.CHAINFLIP_NETWORK)),
  })
  .transform(({ value }) => ({ chain: 'Bitcoin', address: value }) as const);

const arbChainAddress = z
  .object({
    __kind: z.literal('Arb'),
    value: ethereumAddress,
  })
  .transform(({ value }) => ({ chain: 'Arbitrum', address: value }) as const);

export const encodedAddress = z.union([
  ethChainAddress,
  dotChainAddress,
  btcChainAddress,
  arbChainAddress,
]);

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

export const getDepositTxRef = (
  chain: Chain,
  depositDetails:
    | z.output<typeof bitcoinSchema160>['depositDetails']
    | z.output<typeof bitcoinSchema170>['depositDetails']
    | z.output<typeof ethereumIngressEgressDepositFinalised>['depositDetails']
    | z.output<typeof polkadotIngressEgressDepositFinalised>['depositDetails']
    | undefined,
  blockHeight?: bigint | number,
) => {
  if (depositDetails === undefined) {
    return undefined;
  }

  switch (chain) {
    case 'Arbitrum':
    case 'Ethereum': {
      const details = depositDetails as z.output<
        typeof ethereumIngressEgressDepositFinalised
      >['depositDetails'];
      return formatTxHash(chain, details?.txHashes?.at(0));
    }
    case 'Bitcoin': {
      const details = depositDetails as
        | z.output<typeof bitcoinSchema160>['depositDetails']
        | z.output<typeof bitcoinSchema170>['depositDetails'];
      return formatTxHash(chain, 'txId' in details ? details.txId : details.id.txId);
    }
    case 'Polkadot': {
      const details = depositDetails as z.output<
        typeof polkadotIngressEgressDepositFinalised
      >['depositDetails'];
      if (blockHeight === undefined) return undefined;
      return formatTxHash(chain, `${blockHeight}-${details}`);
    }
    case 'Solana':
      assert(depositDetails == null);
      return undefined;
    default:
      return assertUnreachable(chain);
  }
};
