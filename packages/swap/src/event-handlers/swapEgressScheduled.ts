import { z } from 'zod';
import { Asset, assetChains } from '@/shared/enums';
import { chainflipChain, unsignedInteger } from '@/shared/parsers';
import { Environment, getEnvironmentAtBlock } from '@/shared/rpc';
import { readAssetValue } from '@/shared/rpc/utils';
import { CacheMap } from '@/swap/utils/dataStructures';
import type { EventHandlerArgs } from '.';

const eventArgs = z.object({
  swapId: unsignedInteger,
  egressId: z.tuple([
    z.object({ __kind: chainflipChain }).transform(({ __kind }) => __kind),
    unsignedInteger,
  ]),
});

const environmentByBlockHashCache = new CacheMap<
  string,
  Promise<Environment | null>
>(60_000);

const getCachedEnvironmentAtBlock = async (
  blockHash: string,
): Promise<Environment | null> => {
  const cached = environmentByBlockHashCache.get(blockHash);
  if (cached) return cached;

  try {
    const env = getEnvironmentAtBlock(
      { rpcUrl: process.env.RPC_NODE_HTTP_URL as string },
      [blockHash],
    );
    environmentByBlockHashCache.set(blockHash, env);

    return await env;
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!/Exported method .+ is not found/.test((e as any)?.cause?.message)) {
      throw e;
    }

    environmentByBlockHashCache.set(blockHash, Promise.resolve(null));
  }

  return null;
};

const getEgressFeeAtBlock = async (
  blockHash: string,
  asset: Asset,
): Promise<bigint> => {
  const env = await getCachedEnvironmentAtBlock(blockHash);
  if (!env) return 0n;

  return readAssetValue(env.ingressEgress.egressFees, {
    asset,
    chain: assetChains[asset],
  });
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
  } = eventArgs.parse(event.args);

  const swap = await prisma.swap.findUniqueOrThrow({
    where: { nativeId: swapId },
  });

  // TODO: use an accurate source for determining the egress fee once the protocol provides one
  const egressFee = await getEgressFeeAtBlock(block.hash, swap.destAsset);

  await prisma.swap.update({
    where: { nativeId: swapId },
    data: {
      egressAmount: swap.destAmount?.sub(egressFee.toString()),
      egress: { connect: { nativeId_chain: { chain, nativeId } } },
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
