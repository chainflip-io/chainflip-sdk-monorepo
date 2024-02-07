import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN } from '@polkadot/util';
import { z } from 'zod';
import { u64, chainflipAssetEnum, u128, hexString } from '@/shared/parsers';
import { Prisma } from '../client';
import env from '../config/env';
import { handleExit } from '../utils/function';
import { EventHandlerArgs } from './index';

const swapEgressIgnoredArgs = z.object({
  asset: chainflipAssetEnum,
  amount: u128,
  swapId: u64,
  reason: z.object({
    __kind: z.literal('Module'),
    value: z.object({
      error: hexString,
      index: z.number(),
    }),
  }),
});

type Reason = z.output<typeof swapEgressIgnoredArgs>['reason'];

export type SwapDepositAddressReadyEvent = z.input<
  typeof swapEgressIgnoredArgs
>;

let api: ApiPromise | undefined;

const lookupFailure = async (
  prisma: Prisma.TransactionClient,
  blockHash: string,
  { value }: Reason,
) => {
  if (api === undefined) {
    api = await ApiPromise.create({
      provider: new WsProvider(env.RPC_NODE_WSS_URL),
    });

    handleExit(() => api?.disconnect());
  }

  const historicApi = await api.at(blockHash);
  // convert LE hex encoded number (e.g. "0x06000000") to BN (6)
  const error = new BN(value.error.slice(2), 'hex', 'le');
  const errorIndex = error.toNumber();
  const specVersion = historicApi.runtimeVersion.specVersion.toNumber();
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

  const registryError = api.registry.findMetaError({
    index: new BN(palletIndex),
    error,
  });

  return prisma.stateChainError.create({
    data: {
      specVersion: historicApi.runtimeVersion.specVersion.toNumber(),
      palletIndex,
      errorIndex,
      name: `${registryError.section}.${registryError.name}`,
      docs: registryError.docs.join('\n').trim(),
    },
  });
};

export default async function swapEgressIgnored({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const { amount, swapId, reason } = swapEgressIgnoredArgs.parse(event.args);

  const [failure, swap] = await Promise.all([
    lookupFailure(prisma, block.hash, reason),
    prisma.swap.findUniqueOrThrow({ where: { nativeId: swapId } }),
  ]);

  await prisma.ignoredEgress.create({
    data: {
      swapId: swap.id,
      ignoredAt: new Date(block.timestamp),
      ignoredBlockIndex: `${block.height}-${event.indexInBlock}`,
      amount: amount.toString(),
      stateChainErrorId: failure.id,
    },
  });
}
