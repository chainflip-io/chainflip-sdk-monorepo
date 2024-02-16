import { Metadata, TypeRegistry } from '@polkadot/types';
import { BN } from '@polkadot/util';
import assert from 'assert';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import {
  btcAddress,
  dotAddress,
  hexString,
  unsignedInteger,
  chainEnum,
} from '@/shared/parsers';
import * as rpc from '@/shared/rpc';
import { Prisma } from '../client';
import env from '../config/env';
import { CacheMap } from '../utils/dataStructures';
import type { EventHandlerArgs } from '.';

export const egressId = z.tuple([chainEnum, unsignedInteger]);

const ethChainAddress = z.object({
  __kind: z.literal('Eth'),
  value: hexString,
});
const dotChainAddress = z.object({
  __kind: z.literal('Dot'),
  value: dotAddress,
});
const btcChainAddress = z.object({
  __kind: z.literal('Btc'),
  value: hexString
    .transform((v) => Buffer.from(v.slice(2), 'hex').toString())
    .pipe(btcAddress(env.CHAINFLIP_NETWORK)),
});

export const encodedAddress = z
  .union([ethChainAddress, dotChainAddress, btcChainAddress])
  .transform(
    ({ __kind, value }) =>
      ({
        chain: assetConstants[__kind].chain,
        address: value,
      }) as const,
  );

const metadataCache = new CacheMap<string, Metadata>(60_000 * 60);

const getMetadata = async (block: EventHandlerArgs['block']) => {
  let metadata = metadataCache.get(block.specId);

  if (!metadata) {
    const metadataString = await rpc.getMetadata(
      { rpcUrl: env.RPC_NODE_HTTP_URL },
      block.hash,
    );
    const registry = new TypeRegistry();
    metadata = new Metadata(registry, metadataString);
    registry.setMetadata(metadata);

    metadataCache.set(block.specId, metadata);
  }

  return metadata;
};

const parseSpecNumber = (specId: string) => {
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
  // convert LE hex encoded number (e.g. "0x06000000") to BN (6)
  const error = new BN(value.error.slice(2), 'hex', 'le');
  const errorIndex = error.toNumber();
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

  const registryError = metadata.registry.findMetaError({
    index: new BN(palletIndex),
    error,
  });

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
