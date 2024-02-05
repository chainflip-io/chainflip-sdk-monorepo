import { z } from 'zod';
import { u64, chainflipAssetEnum, u128, hexString } from '@/shared/parsers';
import { Prisma } from '../client';
import { EventHandlerArgs } from './index';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { BN } from '@polkadot/util';
import env from '../config/env';

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
  api ??= await ApiPromise.create({
    provider: new WsProvider(env.RPC_NODE_WSS_URL),
  });

  const historicApi = await api.at(blockHash);
  const error = new BN(value.error.slice(2), 'hex', 'le');
  const errorIndex = error.toNumber();
  const specVersion = historicApi.runtimeVersion.specVersion.toNumber();
  const palletIndex = value.index;

  const failureReason = await prisma.failedSwapReason.findUnique({
    where: {
      specVersion_palletIndex_errorIndex: {
        specVersion: specVersion,
        palletIndex,
        errorIndex,
      },
    },
  });

  if (failureReason) return failureReason;

  const registryError = api.registry.findMetaError({
    index: new BN(palletIndex),
    error: error,
  });

  return prisma.failedSwapReason.create({
    data: {
      specVersion: historicApi.runtimeVersion.specVersion.toNumber(),
      palletIndex,
      errorIndex,
      name: registryError?.name ?? 'Unknown',
      docs: registryError?.docs.join('\n').trim() ?? 'Unknown',
    },
  });
};

export default async function swapEgressIgnored({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const { asset, amount, swapId, reason } = swapEgressIgnoredArgs.parse(
    event.args,
  );

  const failure = await lookupFailure(prisma, block.hash, reason);
}
