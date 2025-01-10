import { swappingSwapRequested as schema160 } from '@chainflip/processor/160/swapping/swapRequested';
import { swappingSwapRequested as schema170 } from '@chainflip/processor/170/swapping/swapRequested';
import { swappingSwapRequested as schema180 } from '@chainflip/processor/180/swapping/swapRequested';
import { findSolanaDepositSignature } from '@chainflip/solana';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import z from 'zod';
import { formatTxRef } from '@/shared/common';
import { assetConstants, Chain, InternalAsset } from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import { assertNever } from '@/shared/guards';
import { pascalCaseToScreamingSnakeCase } from '@/shared/strings';
import env from '@/swap/config/env';
import { Prisma } from '../client';
import type { EventHandlerArgs } from './index';

type RequestType170 = z.output<typeof schema170>['requestType'];

const transform160RequestType = (
  old: z.output<typeof schema160>['requestType'],
): RequestType170 => {
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

const transform160Schema = (data: z.output<typeof schema160>): z.output<typeof schema170> => ({
  inputAsset: data.inputAsset,
  inputAmount: data.inputAmount,
  outputAsset: data.outputAsset,
  swapRequestId: data.swapRequestId,
  dcaParameters: data.dcaParameters,
  origin: data.origin,
  requestType: transform160RequestType(data.requestType),
});

const transform170Schema = (data: z.output<typeof schema170>): z.output<typeof schema180> => {
  let requestType;
  if (data.requestType.__kind === 'Ccm') {
    requestType = {
      ...data.requestType,
      __kind: 'Regular' as const,
      ccmDepositMetadata: {
        ...data.requestType.ccmSwapMetadata.depositMetadata,
        channelMetadata: {
          ...data.requestType.ccmSwapMetadata.depositMetadata.channelMetadata,
          ccmAdditionalData:
            data.requestType.ccmSwapMetadata.depositMetadata.channelMetadata.cfParameters,
        },
      },
    };
  } else {
    requestType = data.requestType;
  }

  let origin;
  if (data.origin.__kind === 'Vault') {
    origin = {
      __kind: 'Vault' as const,
      txId: {
        __kind: 'Evm' as const, // protocol supported evm vault swaps < 1.8
        value: data.origin.txHash,
      },
    };
  } else {
    origin = data.origin;
  }

  return {
    inputAsset: data.inputAsset,
    inputAmount: data.inputAmount,
    outputAsset: data.outputAsset,
    swapRequestId: data.swapRequestId,
    dcaParameters: data.dcaParameters,
    requestType,
    origin,
    brokerFees: [],
  };
};

const schema = z.union([
  schema180,
  schema170.transform(transform170Schema),
  schema160.transform(transform160Schema).transform(transform170Schema),
]);

type RequestType = z.output<typeof schema>['requestType'];
type Origin = z.output<typeof schema>['origin'];
export type SwapRequestedArgs = z.input<typeof schema>;

const getRequestInfo = (requestType: RequestType) => {
  if (requestType.__kind === 'Regular') {
    return {
      destAddress: requestType.outputAddress.address,
      ccmMetadata: requestType.ccmDepositMetadata,
    };
  }

  if (requestType.__kind === 'IngressEgressFee' || requestType.__kind === 'NetworkFee') {
    return { destAddress: undefined, ccmMetadata: undefined };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(requestType, `unexpected request type: ${(requestType as any).__kind}`);
};

export const getVaultOriginTxRef = async (
  chain: Chain,
  origin: Extract<z.output<typeof schema180>['origin'], { __kind: 'Vault' }>,
) => {
  const kind = origin.txId.__kind;

  switch (kind) {
    case 'Evm': {
      return formatTxRef(chain, origin.txId.value);
    }
    case 'Bitcoin': {
      return formatTxRef(chain, origin.txId.value);
    }
    case 'Polkadot': {
      return formatTxRef(
        chain,
        `${origin.txId.value.blockNumber}-${origin.txId.value.extrinsicIndex}`,
      );
    }
    case 'Solana': {
      // vault swap tx pays rent to vault swap account
      const [vaultSwapAccount, slot] = origin.txId.value;
      return findSolanaDepositSignature(
        env.SOLANA_RPC_HTTP_URL,
        null,
        base58.encode(hexToBytes(vaultSwapAccount)),
        1n, // dummy amount to detect rent payment
        Number(slot),
        Number(slot),
      );
    }
    case 'None': {
      return undefined;
    }
    default:
      return assertUnreachable(kind);
  }
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
      depositTransactionRef: await getVaultOriginTxRef(assetConstants[srcAsset].chain, origin),
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

  // TODO(1.9): remove this because all external swaps have a DepositFinalised event from 1.8
  const additionalInfo = ccmMetadata
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
      requestType: ccmMetadata ? 'CCM' : pascalCaseToScreamingSnakeCase(requestType.__kind),
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
