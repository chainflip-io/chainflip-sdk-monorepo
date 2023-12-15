import { z } from 'zod';
import { Asset, assetChains, chainNativeAssets } from '@/shared/enums';
import { chainflipChain, unsignedInteger } from '@/shared/parsers';
import { Environment, getEnvironment, getSwapRate } from '@/shared/rpc';
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

const methodNotFoundRegExp = /Exported method .+ is not found/;
const rpcConfig = { rpcUrl: process.env.RPC_NODE_HTTP_URL as string };

const getCachedEnvironmentAtBlock = async (
  blockHash: string,
): Promise<Environment | null> => {
  const cached = environmentByBlockHashCache.get(blockHash);
  if (cached) return cached;

  const env = getEnvironment(rpcConfig, blockHash).catch((e: Error) => {
    const cause = e.cause as { message: string } | undefined;

    if (methodNotFoundRegExp.test(cause?.message ?? '')) return null;

    environmentByBlockHashCache.delete(blockHash);
    throw e;
  });

  environmentByBlockHashCache.set(blockHash, env);

  return env;
};

const assetAmountByNativeAmountAndBlockHashCache = new CacheMap<
  string,
  Promise<bigint>
>(60_000);

const getCachedAssetAmountAtBlock = async (
  asset: Asset,
  nativeAmount: bigint,
  blockHash: string,
): Promise<bigint> => {
  const cacheKey = `${asset}-${nativeAmount.toString()}-${blockHash}`;
  const cached = assetAmountByNativeAmountAndBlockHashCache.get(cacheKey);
  if (cached) return cached;

  const nativeAsset = chainNativeAssets[assetChains[asset]];
  if (asset === nativeAsset) return nativeAmount;

  // TODO: we get the output amount for the "nativeAmount" instead of figuring out the required input amount
  // this makes the result different to the backend if there are limit orders that affect the price in one direction
  // https://github.com/chainflip-io/chainflip-backend/blob/4318931178a1696866e1e70e65d73d722bee4afd/state-chain/pallets/cf-pools/src/lib.rs#L2025
  const rate = getSwapRate(rpcConfig, nativeAsset, asset, String(nativeAmount))
    .then((r) => r.output)
    .catch((e: Error) => {
      assetAmountByNativeAmountAndBlockHashCache.delete(blockHash);
      throw e;
    });

  assetAmountByNativeAmountAndBlockHashCache.set(cacheKey, rate);

  return rate;
};

const getEgressFeeAtBlock = async (
  blockHash: string,
  asset: Asset,
): Promise<bigint> => {
  const env = await getCachedEnvironmentAtBlock(blockHash);
  if (!env) return 0n;

  const nativeFee = readAssetValue(env.ingressEgress.egressFees, {
    asset,
    chain: assetChains[asset],
  });

  return getCachedAssetAmountAtBlock(asset, nativeFee, blockHash);
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
