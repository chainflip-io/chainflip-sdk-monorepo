import { swappingSwapRequested as schema160 } from '@chainflip/processor/160/swapping/swapRequested';
import { swappingSwapRequested as schema170 } from '@chainflip/processor/170/swapping/swapRequested';
import z from 'zod';
import { assetConstants, InternalAsset } from '@/shared/enums';
import { assertNever } from '@/shared/guards';
import { pascalCaseToScreamingSnakeCase } from '@/shared/strings';
import { formatTxHash } from './common';
import { Prisma } from '../client';
import type { EventHandlerArgs } from './index';

type RequestType170 = z.output<typeof schema170>['requestType'];

const transformRequestType = (old: z.output<typeof schema160>['requestType']): RequestType170 => {
  switch (old.__kind) {
    case 'Regular':
    case 'NetworkFee':
    case 'IngressEgressFee':
      return old;
    case 'Ccm':
      return {
        __kind: 'Ccm',
        outputAddress: old.outputAddress,
        ccmSwapMetadata: {
          depositMetadata: old.ccmDepositMetadata,
          swapAmounts: {
            principalSwapAmount: 0n,
            gasBudget: 0n,
            otherGasAsset: null,
          },
        },
      };
    default:
      throw new Error();
  }
};

const transformOldSchema = (data: z.output<typeof schema160>): z.output<typeof schema170> => ({
  inputAsset: data.inputAsset,
  inputAmount: data.inputAmount,
  outputAsset: data.outputAsset,
  swapRequestId: data.swapRequestId,
  dcaParameters: data.dcaParameters,
  origin: data.origin,
  requestType: transformRequestType(data.requestType),
});

const schema = z.union([schema170, schema160.transform(transformOldSchema)]);

type RequestType = z.output<typeof schema>['requestType'];
type Origin = z.output<typeof schema>['origin'];
export type SwapRequestedArgs = z.input<typeof schema>;

const getRequestInfo = (requestType: RequestType) => {
  let destAddress;
  let ccmMetadata;

  if (requestType.__kind === 'Regular') {
    destAddress = requestType.outputAddress.address;
  } else if (requestType.__kind === 'Ccm') {
    ccmMetadata = requestType.ccmSwapMetadata.depositMetadata;
    destAddress = requestType.outputAddress.address;
  }

  if (requestType.__kind === 'Regular' || requestType.__kind === 'Ccm') {
    return { destAddress, ccmMetadata };
  }

  if (requestType.__kind === 'IngressEgressFee' || requestType.__kind === 'NetworkFee') {
    return { destAddress: undefined, ccmMetadata: undefined };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(requestType, `unexpected request type: ${(requestType as any).__kind}`);
};

export const getOriginInfo = async (
  prisma: Prisma.TransactionClient,
  srcAsset: InternalAsset,
  origin: Origin,
) => {
  if (origin.__kind === 'DepositChannel') {
    const depositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: {
        srcAsset,
        depositAddress: origin.depositAddress.address,
        channelId: origin.channelId,
      },
      orderBy: {
        issuedBlock: 'desc',
      },
      select: { id: true },
    });

    return {
      originType: 'DEPOSIT_CHANNEL' as const,
      swapDepositChannelId: depositChannel.id,
      depositTransactionRef: undefined,
    };
  }

  if (origin.__kind === 'Vault') {
    return {
      originType: 'VAULT' as const,
      swapDepositChannelId: undefined,
      depositTransactionRef: formatTxHash(assetConstants[srcAsset].chain, origin.txHash),
    };
  }

  if (origin.__kind === 'Internal') {
    return {
      originType: 'INTERNAL' as const,
      swapDepositChannelId: undefined,
      depositTransactionRef: undefined,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(origin, `unexpected origin: ${(origin as any).__kind}`);
};

export default async function swapRequested({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const {
    inputAmount,
    inputAsset,
    swapRequestId,
    outputAsset,
    origin,
    requestType,
    dcaParameters,
  } = schema.parse(event.args);

  const { originType, swapDepositChannelId, depositTransactionRef } = await getOriginInfo(
    prisma,
    inputAsset,
    origin,
  );

  const { destAddress, ccmMetadata } = getRequestInfo(requestType);

  const additionalInfo =
    requestType.__kind === 'Ccm'
      ? {
          depositFinalisedAt: new Date(block.timestamp),
          depositFinalisedBlockIndex: `${block.height}-${event.indexInBlock}`,
          ccmDepositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
        }
      : undefined;

  await prisma.swapRequest.create({
    data: {
      nativeId: swapRequestId,
      originType,
      depositTransactionRef,
      swapDepositChannelId,
      srcAsset: inputAsset,
      destAsset: outputAsset,
      requestType: pascalCaseToScreamingSnakeCase(requestType.__kind),
      ccmGasBudget: ccmMetadata?.channelMetadata.gasBudget.toString(),
      ccmMessage: ccmMetadata?.channelMetadata.message,
      srcAddress: ccmMetadata?.sourceAddress?.address,
      destAddress,
      swapRequestedAt: new Date(block.timestamp),
      swapRequestedBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapInputAmount: inputAmount.toString(),
      ...additionalInfo,
      ...(origin.__kind !== 'Internal' && {
        depositAmount: inputAmount.toString(),
      }),
      numberOfChunks: dcaParameters?.numberOfChunks,
      chunkIntervalBlocks: dcaParameters?.chunkInterval,
    },
  });
}
