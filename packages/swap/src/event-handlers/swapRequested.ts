import { swappingSwapRequested as schema170 } from '@chainflip/processor/170/swapping/swapRequested';
import { swappingSwapRequested as schema180 } from '@chainflip/processor/180/swapping/swapRequested';
import * as base58 from '@chainflip/utils/base58';
import assert from 'assert';
import z from 'zod';
import { formatTxRef } from '@/shared/common';
import { assetConstants, Chain, InternalAsset } from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import { assertNever } from '@/shared/guards';
import { pascalCaseToScreamingSnakeCase } from '@/shared/strings';
import { Prisma } from '../client';
import type { EventHandlerArgs } from './index';

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
      brokerId: undefined,
    };
  } else if (data.origin.__kind === 'DepositChannel') {
    origin = { ...data.origin, brokerId: '' };
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

const schema = z.union([schema180, schema170.transform(transform170Schema)]);

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

export const getVaultOriginTxRef = (
  chain: Chain,
  origin: Extract<z.output<typeof schema180>['origin'], { __kind: 'Vault' }>,
) => {
  const kind = origin.txId.__kind;

  switch (kind) {
    case 'Evm':
    case 'Bitcoin':
      return formatTxRef(chain, origin.txId.value);
    case 'Polkadot':
      return formatTxRef(
        chain,
        `${origin.txId.value.blockNumber}-${origin.txId.value.extrinsicIndex}`,
      );
    case 'Solana':
    case 'None':
      return undefined;
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
      brokerId: origin.brokerId,
    };
  }

  if (origin.__kind === 'Vault') {
    return {
      originType: 'VAULT' as const,
      swapDepositChannelId: undefined,
      depositTransactionRef: getVaultOriginTxRef(assetConstants[srcAsset].chain, origin),
      brokerId: origin.brokerId,
    };
  }

  if (origin.__kind === 'Internal') {
    return {
      originType: 'INTERNAL' as const,
      swapDepositChannelId: undefined,
      depositTransactionRef: undefined,
      brokerId: undefined,
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
    refundParameters,
    brokerFees,
  } = schema.parse(event.args);

  const { originType, swapDepositChannelId, depositTransactionRef, brokerId } = await getOriginInfo(
    prisma,
    inputAsset,
    origin,
  );

  const { destAddress, ccmMetadata } = getRequestInfo(requestType);

  const beneficiaries = brokerFees
    .map(({ account, bps: commissionBps }) => ({
      type: account === brokerId ? ('SUBMITTER' as const) : ('AFFILIATE' as const),
      account,
      commissionBps,
    }))
    .filter(({ commissionBps }) => commissionBps > 0);

  const totalCommissionBps = beneficiaries.reduce(
    (acc, { commissionBps }) => acc + commissionBps,
    0,
  );

  // TODO(1.9): remove this because all external swaps have a DepositFinalised event from 1.8
  const additionalInfo = ccmMetadata
    ? {
        depositFinalisedAt: new Date(block.timestamp),
        depositFinalisedBlockIndex: `${block.height}-${event.indexInBlock}`,
        ccmDepositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
      }
    : undefined;

  const swapRequest = await prisma.swapRequest.create({
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
      dcaNumberOfChunks: dcaParameters?.numberOfChunks,
      dcaChunkIntervalBlocks: dcaParameters?.chunkInterval,
      fokMinPriceX128: refundParameters?.minPrice?.toString(),
      fokRefundAddress: refundParameters?.refundAddress.address,
      fokRetryDurationBlocks: refundParameters?.retryDuration,
      totalBrokerCommissionBps: totalCommissionBps,
      beneficiaries: {
        createMany: {
          data: beneficiaries,
        },
      },
    },
  });

  if (assetConstants[inputAsset].chain === 'Solana') {
    let pendingTxRefInfo;
    if (origin.__kind === 'DepositChannel') {
      pendingTxRefInfo = { swapDepositChannelId };
    } else if (origin.__kind === 'Vault') {
      assert(origin.txId.__kind === 'Solana');
      pendingTxRefInfo = {
        address: base58.encode(origin.txId.value[0]),
        slot: origin.txId.value[1],
        vaultSwapRequestId: swapRequest.id,
      };
    } else if (origin.__kind !== 'Internal') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assertUnreachable(origin, `unexpected origin: ${(origin as any).__kind}`);
    }

    await prisma.solanaPendingTxRef.create({ data: pendingTxRefInfo });
  }
}
