import { swappingSwapRequested as schema11000 } from '@chainflip/processor/11000/swapping/swapRequested';
import { swappingSwapRequested as schema11100 } from '@chainflip/processor/11100/swapping/swapRequested';
import * as base58 from '@chainflip/utils/base58';
import { assetConstants, ChainflipAsset } from '@chainflip/utils/chainflip';
import { isNullish } from '@chainflip/utils/guard';
import assert from 'assert';
import z from 'zod';
import { formatTxRef } from '@/shared/common.js';
import { assertUnreachable } from '@/shared/functions.js';
import { assertNever } from '@/shared/guards.js';
import { pascalCaseToScreamingSnakeCase } from '@/shared/strings.js';
import { Prisma } from '../../client.js';
import { formatForeignChainAddress } from '../common.js';
import type { EventHandlerArgs } from '../index.js';

const schema = z.union([
  schema11100.transform(({ priceLimitsAndExpiry, ...rest }) => ({
    ...rest,
    refundParameters: priceLimitsAndExpiry && {
      v11: priceLimitsAndExpiry,
    },
  })),
  schema11000.transform(({ refundParameters, ...rest }) => ({
    ...rest,
    refundParameters: refundParameters && {
      v10: refundParameters,
    },
  })),
]);

type RequestType = z.output<typeof schema>['requestType'];
type Origin = z.output<typeof schema>['origin'];
export type SwapRequestedArgs = z.input<typeof schema>;

const getRequestInfo = (requestType: RequestType) => {
  if (requestType.__kind === 'IngressEgressFee' || requestType.__kind === 'NetworkFee') {
    return { type: 'INTERNAL' as const, destAddress: undefined, ccmMetadata: undefined };
  }

  if (requestType.__kind === 'Regular') {
    if (requestType.outputAction.__kind === 'Egress') {
      return {
        type: 'EGRESS' as const,
        destAddress: requestType.outputAction.outputAddress.address,
        ccmMetadata: requestType.outputAction.ccmDepositMetadata,
      };
    }

    if (requestType.outputAction.__kind === 'CreditOnChain') {
      return {
        type: 'ON_CHAIN' as const,
        destAddress: requestType.outputAction.accountId,
        ccmMetadata: undefined,
      };
    }

    return assertNever(
      requestType.outputAction,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `unexpected output action: ${(requestType.outputAction as any).__kind}`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(requestType, `unexpected request type: ${(requestType as any).__kind}`);
};

export const getVaultOriginTxRef = (
  origin: Extract<z.output<typeof schema>['origin'], { __kind: 'Vault' }>,
) => {
  const kind = origin.txId.__kind;

  switch (kind) {
    case 'Evm':
      return formatTxRef({ chain: 'Ethereum', data: origin.txId.value });
    case 'Bitcoin':
      return formatTxRef({ chain: 'Bitcoin', data: origin.txId.value });
    case 'Polkadot':
      return formatTxRef({ chain: 'Polkadot', data: origin.txId.value });
    case 'Solana':
    case 'None':
      return undefined;
    default:
      return assertUnreachable(kind);
  }
};

export const getOriginInfo = async (
  prisma: Prisma.TransactionClient,
  srcAsset: ChainflipAsset,
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
      originType: 'DEPOSIT_CHANNEL',
      swapDepositChannelId: depositChannel.id,
      depositTransactionRef: undefined,
      brokerId: origin.brokerId,
      accountId: undefined,
    } as const;
  }

  if (origin.__kind === 'Vault') {
    return {
      originType: 'VAULT',
      swapDepositChannelId: undefined,
      depositTransactionRef: getVaultOriginTxRef(origin),
      brokerId: origin.brokerId,
      accountId: undefined,
    } as const;
  }

  if (origin.__kind === 'Internal') {
    return {
      originType: 'INTERNAL',
      swapDepositChannelId: undefined,
      depositTransactionRef: undefined,
      brokerId: undefined,
      accountId: undefined,
    } as const;
  }

  if (origin.__kind === 'OnChainAccount') {
    return {
      originType: 'ON_CHAIN',
      swapDepositChannelId: undefined,
      depositTransactionRef: undefined,
      brokerId: undefined,
      accountId: origin.value,
    } as const;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return assertNever(origin, `unexpected origin: ${(origin as any).__kind}`);
};

const extractRefundParameters = (refundParameters: z.output<typeof schema>['refundParameters']) => {
  if (!refundParameters) return null;

  let fokRefundAddress;
  let fokMinPriceX128;
  let fokRetryDurationBlocks;
  let fokMaxOraclePriceSlippage;

  // 1.11
  if ('v11' in refundParameters) {
    fokMinPriceX128 = refundParameters.v11.minPrice.toString();
    fokMaxOraclePriceSlippage = refundParameters.v11.maxOraclePriceSlippage;
    if (refundParameters.v11.expiryBehaviour.__kind === 'RefundIfExpires') {
      if (refundParameters.v11.expiryBehaviour.refundAddress.__kind === 'InternalAccount') {
        fokRefundAddress = refundParameters.v11.expiryBehaviour.refundAddress.value;
      } else if (refundParameters.v11.expiryBehaviour.refundAddress.__kind === 'ExternalAddress') {
        fokRefundAddress = formatForeignChainAddress(
          refundParameters.v11.expiryBehaviour.refundAddress.value,
        );
      }
      fokRetryDurationBlocks = refundParameters.v11.expiryBehaviour.retryDuration;
    } else if (refundParameters.v11.expiryBehaviour.__kind === 'NoExpiry') {
      // I think this is part of lending. do nothing for now.
    }
  }
  // 1.10
  if ('v10' in refundParameters) {
    fokMinPriceX128 = refundParameters.v10.minPrice.toString();
    fokRetryDurationBlocks = refundParameters.v10.retryDuration;

    if (refundParameters.v10.refundDestination.__kind === 'InternalAccount') {
      fokRefundAddress = refundParameters.v10.refundDestination.value;
    } else if (refundParameters.v10.refundDestination.__kind === 'ExternalAddress') {
      fokRefundAddress =
        'address' in refundParameters.v10.refundDestination.value
          ? refundParameters.v10.refundDestination.value.address
          : formatForeignChainAddress(refundParameters.v10.refundDestination.value);
    } else {
      return assertNever(
        refundParameters.v10.refundDestination,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        `unexpected refund destination: ${(refundParameters.v10.refundDestination as any).__kind}`,
      );
    }
  }

  return {
    fokMinPriceX128,
    fokRefundAddress,
    fokRetryDurationBlocks,
    fokMaxOraclePriceSlippage,
  };
};

const buildOnChainSwapInfo = (
  origin: Awaited<ReturnType<typeof getOriginInfo>>,
  requestInfo: ReturnType<typeof getRequestInfo>,
  refundParameters: ReturnType<typeof extractRefundParameters>,
) => {
  if (origin.originType !== 'ON_CHAIN') return null;
  assert(requestInfo.type === 'ON_CHAIN', 'expected on-chain request info');
  assert(origin.accountId === requestInfo.destAddress, 'expected matching account IDs');
  assert(
    isNullish(refundParameters) || refundParameters.fokRefundAddress === origin.accountId,
    'expected matching refund address',
  );

  return {
    srcAddress: origin.accountId,
    onChainSwapInfo: {
      create: {
        accountId: origin.accountId,
      },
    },
  };
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

  const originInfo = await getOriginInfo(prisma, inputAsset, origin);

  const { originType, swapDepositChannelId, depositTransactionRef, brokerId } = originInfo;

  const requestInfo = getRequestInfo(requestType);

  const { destAddress, ccmMetadata } = requestInfo;

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

  const fokParams = extractRefundParameters(refundParameters);

  const swapRequest = await prisma.swapRequest.create({
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
      ...(origin.__kind !== 'Internal' &&
        origin.__kind !== 'OnChainAccount' && {
          depositAmount: inputAmount.toString(),
        }),
      dcaNumberOfChunks: dcaParameters?.numberOfChunks,
      dcaChunkIntervalBlocks: dcaParameters?.chunkInterval,
      ...fokParams,
      totalBrokerCommissionBps: totalCommissionBps,
      beneficiaries: {
        createMany: {
          data: beneficiaries,
        },
      },
      ...buildOnChainSwapInfo(originInfo, requestInfo, fokParams),
    },
  });

  if (
    assetConstants[inputAsset].chain === 'Solana' &&
    originType !== 'INTERNAL' &&
    originType !== 'ON_CHAIN'
  ) {
    let pendingTxRefInfo;
    if (originType === 'DEPOSIT_CHANNEL') {
      pendingTxRefInfo = { swapDepositChannelId };
    } else if (originType === 'VAULT') {
      assert(origin.__kind === 'Vault' && origin.txId.__kind === 'Solana');
      pendingTxRefInfo = {
        address: base58.encode(origin.txId.value[0]),
        slot: origin.txId.value[1],
        vaultSwapRequestId: swapRequest.id,
      };
    } else {
      assertUnreachable(originType, `unexpected origin: ${originType}`);
    }

    await prisma.solanaPendingTxRef.create({ data: pendingTxRefInfo });
  }
}
