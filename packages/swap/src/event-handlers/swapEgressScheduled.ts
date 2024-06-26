import { z } from 'zod';
import { InternalAsset, readChainAssetValue } from '@/shared/enums';
import { bigintMin } from '@/shared/functions';
import { u128, unsignedInteger } from '@/shared/parsers';
import { Environment, getEnvironment } from '@/shared/rpc';
import { egressId } from '@/swap/event-handlers/common';
import { CacheMap } from '@/swap/utils/dataStructures';
import env from '../config/env';
import type { EventHandlerArgs } from '.';

const eventArgsWithoutFee = z.object({
  swapId: unsignedInteger,
  egressId,
});

const v120EventArgs = eventArgsWithoutFee.and(z.object({ amount: u128, fee: u128 }));

const eventArgs = z.union([v120EventArgs, eventArgsWithoutFee]);

const environmentByBlockHashCache = new CacheMap<string, Promise<Environment | null>>(60_000);

const methodNotFoundRegExp = /Exported method .+ is not found/;
const rpcConfig = { rpcUrl: env.RPC_NODE_HTTP_URL };

const getCachedEnvironmentAtBlock = async (blockHash: string): Promise<Environment | null> => {
  const cached = environmentByBlockHashCache.get(blockHash);
  if (cached) return cached;

  const environment = getEnvironment(rpcConfig, blockHash).catch((e: Error) => {
    const cause = e.cause as { message: string } | undefined;

    if (methodNotFoundRegExp.test(cause?.message ?? '')) return null;

    environmentByBlockHashCache.delete(blockHash);
    throw e;
  });

  environmentByBlockHashCache.set(blockHash, environment);

  return environment;
};

const getEgressFeeAtBlock = async (
  blockHash: string,
  asset: InternalAsset,
): Promise<bigint | null> => {
  const environment = await getCachedEnvironmentAtBlock(blockHash);
  if (!environment) return null;

  return readChainAssetValue(environment.ingressEgress.egressFees, asset);
};

/**
 * this event is emitted in order to correlate the egress id from a network
 * deposit/egress pallet to a swap id
 */
export default async function swapEgressScheduled({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const {
    swapId,
    egressId: [chain, nativeId],
    ...restArgs
  } = eventArgs.parse(event.args);

  const swap = await prisma.swap.findUniqueOrThrow({
    where: { nativeId: swapId },
  });

  let egressFee;
  let egress;

  if ('fee' in restArgs) {
    // > v120
    egressFee = restArgs.fee;
    egress = await prisma.egress.create({
      data: {
        nativeId,
        chain,
        amount: restArgs.amount.toString(),
        scheduledAt: new Date(block.timestamp),
        scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
      },
    });
  } else {
    // < v120
    egressFee = bigintMin(
      (await getEgressFeeAtBlock(block.hash, swap.destAsset)) ?? 0n,
      BigInt(swap.swapOutputAmount?.toFixed() ?? 0),
    );
    egress = await prisma.egress.update({
      where: { nativeId_chain: { chain, nativeId } },
      data: {
        amount: swap.swapOutputAmount?.sub(egressFee.toString()),
      },
    });
  }

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      egress: { connect: { id: egress.id } },
      fees: {
        create: {
          type: 'EGRESS',
          asset: swap.destAsset,
          amount: egressFee.toString(),
        },
      },
    },
  });
}
