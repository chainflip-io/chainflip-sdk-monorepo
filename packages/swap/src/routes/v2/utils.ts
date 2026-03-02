import { cfChainsEvmTransaction } from '@chainflip/processor/141/common';
import {
  AnyChainflipChain,
  anyInternalAssetToRpcAsset,
  AssetSymbol,
} from '@chainflip/utils/chainflip';
import { isTruthy } from '@chainflip/utils/guard';
import { assertUnreachable, getPriceFromPriceX128 } from '@/shared/functions.js';
import { isNotNullish } from '@/shared/guards.js';
import { StateV2 } from './swap.js';
import prisma, {
  Swap,
  Broadcast,
  SwapFee,
  IgnoredEgress,
  FailedSwap,
  SwapRequest,
  Prisma,
} from '../../client.js';
import {
  getPendingBroadcast,
  getPendingDeposit,
  getPendingVaultSwap,
  PendingDeposit,
} from '../../ingress-egress-tracking/index.js';
import { readField } from '../../utils/function.js';
import logger from '../../utils/logger.js';
import ServiceError from '../../utils/ServiceError.js';
import { coerceChain, failedSwapMessage, FailureMode } from '../../utils/swap.js';
import { isTransactionRef } from '../../utils/transactionRef.js';

const failedSwapInclude = { refundBroadcast: true } as const;
const beneficiaryInclude = { type: true, account: true, commissionBps: true } as const;

const accountCreationDepositChannelInclude = {
  failedSwaps: { select: failedSwapInclude },
  swapBeneficiaries: { select: beneficiaryInclude },
} as const;

const swapDepositChannelInclude = {
  failedBoosts: true,
  failedSwaps: { select: failedSwapInclude },
  beneficiaries: { select: beneficiaryInclude },
} as const;

const failedSwapWithChannelsInclude = {
  ...failedSwapInclude,
  swapDepositChannel: { include: swapDepositChannelInclude },
  accountCreationDepositChannel: { include: accountCreationDepositChannelInclude },
} as const;

const swapRequestInclude = {
  swaps: { include: { fees: true }, orderBy: { nativeId: 'asc' } },
  egress: { include: { broadcast: true } },
  fallbackEgress: { include: { broadcast: true } },
  refundEgress: { include: { broadcast: true } },
  fees: true,
  ignoredEgresses: true,
  swapDepositChannel: {
    include: swapDepositChannelInclude,
  },
  accountCreationDepositChannel: {
    include: accountCreationDepositChannelInclude,
  },
  beneficiaries: { select: beneficiaryInclude },
  onChainSwapInfo: true,
  liquidationSwapInfo: true,
} as const;

const channelIdRegex = /^(?<issuedBlock>\d+)-(?<srcChain>[a-z]+)-(?<channelId>\d+)$/i;
const swapRequestIdRegex = /^\d+$/i;

export const getLatestSwapForId = async (id: string) => {
  let swapRequest;
  let failedSwap;
  let swapDepositChannel;
  let pendingVaultSwap;
  let accountCreationDepositChannel;

  if (channelIdRegex.test(id)) {
    const { issuedBlock, srcChain, channelId } = channelIdRegex.exec(id)!.groups!;

    [swapDepositChannel, accountCreationDepositChannel] = await Promise.all([
      prisma.swapDepositChannel.findUnique({
        where: {
          issuedBlock_srcChain_channelId: {
            issuedBlock: Number(issuedBlock),
            srcChain: coerceChain(srcChain),
            channelId: BigInt(channelId),
          },
        },
        include: {
          swapRequests: { include: swapRequestInclude, orderBy: { nativeId: 'desc' } },
          failedSwaps: { include: failedSwapWithChannelsInclude },
          failedBoosts: true,
          beneficiaries: {
            select: {
              type: true,
              account: true,
              commissionBps: true,
            },
          },
        },
      }),
      prisma.accountCreationDepositChannel.findUnique({
        where: {
          issuedBlock_chain_channelId: {
            issuedBlock: Number(issuedBlock),
            chain: coerceChain(srcChain),
            channelId: BigInt(channelId),
          },
        },
        include: {
          swapRequests: { include: swapRequestInclude, orderBy: { nativeId: 'desc' } },
          failedSwaps: {
            include: failedSwapWithChannelsInclude,
          },
          swapBeneficiaries: {
            select: {
              type: true,
              account: true,
              commissionBps: true,
            },
          },
        },
      }),
    ]);

    const channel = accountCreationDepositChannel ?? swapDepositChannel;

    if (!channel) {
      logger.info(`could not find swap request with id "${id}"`);
      throw ServiceError.notFound();
    }

    swapRequest = channel.swapRequests.at(0);
    // swap request will have no swaps for failed ccm swaps: https://scan.chainflip.io/blocks/4716217
    if (!swapRequest || (swapRequest.completedAt && !swapRequest.swaps.length)) {
      failedSwap = channel.failedSwaps.at(0);
    }
  } else if (swapRequestIdRegex.test(id)) {
    swapRequest = await prisma.swapRequest.findUnique({
      where: { nativeId: BigInt(id) },
      include: swapRequestInclude,
    });
  } else if (isTransactionRef(id)) {
    swapRequest = await prisma.swapRequest.findFirst({
      where: { depositTransactionRef: { mode: 'insensitive', equals: id } },
      include: swapRequestInclude,
      // just get the last one for now
      orderBy: { nativeId: 'desc' },
      take: 1,
    });
    if (!swapRequest) {
      [failedSwap, pendingVaultSwap] = await Promise.all([
        prisma.failedSwap.findFirst({
          where: { depositTransactionRef: id },
          include: failedSwapWithChannelsInclude,
        }),
        getPendingVaultSwap(id),
      ]);
    }
  }

  swapDepositChannel ??= swapRequest?.swapDepositChannel ?? failedSwap?.swapDepositChannel;

  accountCreationDepositChannel ??=
    swapRequest?.accountCreationDepositChannel ?? failedSwap?.accountCreationDepositChannel;

  ServiceError.assert(
    swapDepositChannel ||
      accountCreationDepositChannel ||
      swapRequest ||
      failedSwap ||
      pendingVaultSwap,
    'notFound',
    'resource not found',
  );

  return {
    swapRequest,
    failedSwap,
    swapDepositChannel,
    pendingVaultSwap,
    accountCreationDepositChannel,
  };
};

type LatestSwapData = Awaited<ReturnType<typeof getLatestSwapForId>>;

type SwapRequestData = NonNullable<LatestSwapData['swapRequest']>;
type FailedSwapData = NonNullable<LatestSwapData['failedSwap']>;
type SwapChannelData = NonNullable<LatestSwapData['swapDepositChannel']>;
type PendingVaultSwapData = NonNullable<LatestSwapData['pendingVaultSwap']>;
type AccountCreationDepositChannelData = NonNullable<
  LatestSwapData['accountCreationDepositChannel']
>;

export const getSwapFields = (swap: Swap & { fees: SwapFee[] }) => ({
  inputAmount: swap.swapInputAmount.toFixed(),
  intermediateAmount: swap.intermediateAmount?.toFixed(),
  outputAmount: swap.swapOutputAmount?.toFixed(),
  scheduledAt: swap.swapScheduledAt.valueOf(),
  scheduledBlockIndex: swap.swapScheduledBlockIndex ?? undefined,
  executedAt: swap.swapExecutedAt?.valueOf(),
  executedBlockIndex: swap.swapExecutedBlockIndex ?? undefined,
  retryCount: swap.retryCount,
  latestSwapRescheduledAt: swap.latestSwapRescheduledAt?.valueOf(),
  latestSwapRescheduledBlockIndex: swap.latestSwapRescheduledBlockIndex ?? undefined,
  latestSwapRescheduledReason: swap.latestSwapRescheduledReason ?? undefined,
  abortedAt: swap.swapAbortedAt?.valueOf(),
  abortedBlockIndex: swap.swapAbortedBlockIndex ?? undefined,
  abortedReason: swap.swapAbortedReason ?? undefined,
});

const getDepositFailedState = (failedSwap: FailedSwap) => ({
  failedAt: failedSwap.failedAt.valueOf(),
  failedBlockIndex: failedSwap.failedBlockIndex,
  mode: failedSwap.refundBroadcastId ? FailureMode.DepositRejected : FailureMode.IngressIgnored,
  reason: {
    name: failedSwap.reason,
    message: failedSwapMessage[failedSwap.reason],
  },
});

export const getDepositInfo = (
  swapRequest: SwapRequest | null | undefined,
  failedSwap: FailedSwap | null | undefined,
  pendingDeposit: PendingDeposit | null | undefined,
  pendingVaultSwap: PendingVaultSwapData | null | undefined,
) => {
  const amount =
    readField(swapRequest, failedSwap, 'depositAmount')?.toFixed() ??
    pendingDeposit?.amount ??
    (isNotNullish(pendingVaultSwap?.amount) ? pendingVaultSwap.amount.toString() : undefined);

  const depositTransactionRef =
    swapRequest?.depositTransactionRef ??
    pendingDeposit?.txRef ??
    failedSwap?.depositTransactionRef ??
    pendingVaultSwap?.txRef ??
    undefined;

  if (!amount) return null;

  return {
    deposit: {
      amount,
      txRef: depositTransactionRef,
      txConfirmations: pendingDeposit?.txConfirmations ?? pendingVaultSwap?.txConfirmations,
      witnessedAt:
        swapRequest?.depositBoostedAt?.valueOf() ??
        swapRequest?.depositFinalisedAt?.valueOf() ??
        swapRequest?.swapRequestedAt?.valueOf() ??
        undefined,
      witnessedBlockIndex:
        swapRequest?.depositBoostedBlockIndex ??
        swapRequest?.depositFinalisedBlockIndex ??
        swapRequest?.swapRequestedBlockIndex ??
        undefined,
      ...(failedSwap && {
        failure: getDepositFailedState(failedSwap),
        failedAt: failedSwap.failedAt.valueOf(),
        failedBlockIndex: failedSwap.failedBlockIndex,
      }),
    },
  };
};

export const getEgressFailureState = async (
  ignoredEgress: IgnoredEgress | undefined,
  broadcast: Broadcast | null | undefined,
  type: IgnoredEgress['type'] | undefined,
) => {
  const abortedBroadcast = broadcast?.abortedAt?.valueOf();
  const failedAt = abortedBroadcast ?? ignoredEgress?.ignoredAt?.valueOf();
  const failedBlockIndex = broadcast?.abortedBlockIndex ?? ignoredEgress?.ignoredBlockIndex;

  let error;
  let failureMode;

  if (failedAt && failedBlockIndex) {
    error = {
      name: 'Unknown',
      message: 'An unknown error occurred',
    };
    if (ignoredEgress) {
      switch (ignoredEgress.type) {
        case 'REFUND':
          failureMode = FailureMode.RefundEgressIgnored;
          break;
        case 'SWAP':
          failureMode = FailureMode.SwapEgressIgnored;
          break;
        default:
          assertUnreachable(ignoredEgress.type);
      }
      const [stateChainError] = await Promise.all([
        prisma.stateChainError.findUniqueOrThrow({
          where: { id: ignoredEgress.stateChainErrorId },
        }),
      ]);
      error = {
        name: stateChainError.name,
        message: stateChainError.docs,
      };
    } else if (abortedBroadcast) {
      const message =
        type === 'SWAP' ? 'The swap broadcast was aborted' : 'The refund broadcast was aborted';
      failureMode = FailureMode.BroadcastAborted;
      error = {
        name: 'BroadcastAborted',
        message,
      };
    }
    return {
      failedAt,
      failedBlockIndex,
      mode: failureMode,
      reason: error,
    };
  }
  return undefined;
};

type EgressField = {
  [K in keyof SwapRequestData]: SwapRequestData[K] extends SwapRequestData['egress'] ? K : never;
}[keyof SwapRequestData];

export const getEgressStatusFields = async (
  swapRequest: SwapRequestData | undefined | null,
  failedSwap: FailedSwapData | null | undefined,
  egressField: EgressField,
  egressTrackerTxRef: string | null | undefined,
) => {
  let egress = swapRequest?.[egressField];

  let type;
  if (egressField === 'egress') {
    type = 'SWAP' as const;
  } else if (egressField === 'refundEgress') {
    type = 'REFUND' as const;
  }

  if (!egress && type === 'REFUND' && failedSwap?.refundBroadcast) {
    // rejected deposits don't have an egress, but the downstream logic is simplified
    // if it has a fake egress
    egress = {
      amount: failedSwap.depositAmount,
      scheduledAt: failedSwap.refundBroadcast.requestedAt,
      scheduledBlockIndex: failedSwap.refundBroadcast.requestedBlockIndex,
      broadcastId: failedSwap.refundBroadcast.nativeId,
      broadcast: failedSwap.refundBroadcast,
      chain: failedSwap.srcChain,
      nativeId: 0n,
      id: 0n,
      fallbackDestinationAddress: null,
    };
  }

  const broadcast = egress?.broadcast;
  const ignoredEgress = type && swapRequest?.ignoredEgresses?.find((e) => e.type === type);
  const failureState = type && (await getEgressFailureState(ignoredEgress, broadcast, type));

  let transactionPayload;

  if (broadcast?.abortedBlockIndex) {
    const broadcastPayloadObj = JSON.parse(broadcast?.transactionPayload ?? '{}');
    const broadcastPayloadObjParsed = cfChainsEvmTransaction.safeParse(broadcastPayloadObj);

    if (broadcastPayloadObjParsed.error) {
      logger.warn('Could not parse broadcast payload', {
        error: broadcastPayloadObjParsed.error.message,
      });
    } else {
      const { data, value, chainId, contract } = broadcastPayloadObjParsed.data;
      transactionPayload = {
        data,
        value: value.toString(),
        chainId: chainId.toString(),
        contract,
      };
    }
  }

  if (!egress && !broadcast && !failureState && !ignoredEgress) return null;
  return {
    ...(egress && {
      amount: egress.amount?.toFixed(),
      scheduledAt: egress.scheduledAt?.valueOf(),
      scheduledBlockIndex: egress.scheduledBlockIndex ?? undefined,
      destinationAddress: egress.fallbackDestinationAddress ?? undefined,
    }),
    ...(broadcast && {
      witnessedAt: broadcast?.succeededAt?.valueOf(),
      witnessedBlockIndex: broadcast?.succeededBlockIndex ?? undefined,
      txRef: broadcast?.transactionRef ?? egressTrackerTxRef,
      failedAt: broadcast?.abortedAt?.valueOf(),
      failedBlockIndex: broadcast?.abortedBlockIndex ?? undefined,
      transactionPayload,
    }),
    ...(failureState && { failure: failureState }),
    ...(ignoredEgress && {
      amount: ignoredEgress.amount?.toFixed(),
      failedAt: ignoredEgress.ignoredAt?.valueOf(),
      failedBlockIndex: ignoredEgress.ignoredBlockIndex,
    }),
  };
};

export const getSwapState = async (
  failedSwap: FailedSwapData | null | undefined,
  swapRequest: SwapRequestData | undefined | null,
  depositChannel: SwapChannelData | null | undefined,
  pendingVaultSwap: PendingVaultSwapData | null | undefined,
): Promise<{
  state: StateV2;
  swapEgressTrackerTxRef: string | null | undefined;
  refundEgressTrackerTxRef: string | null | undefined;
  fallbackEgressTrackerTxRef: string | null | undefined;
  pendingDeposit: PendingDeposit | null;
}> => {
  let state: StateV2 | undefined;
  let swapEgressTrackerTxRef: string | null | undefined;
  let refundEgressTrackerTxRef: string | null | undefined;
  let fallbackEgressTrackerTxRef: string | null | undefined;
  let pendingDeposit = null;
  const swapEgress = swapRequest?.egress;
  const refundEgress = swapRequest?.refundEgress;
  const fallbackEgress = swapRequest?.fallbackEgress;
  const egress = fallbackEgress ?? swapEgress ?? refundEgress;

  if (failedSwap) {
    state = StateV2.Failed;
    if (failedSwap.refundBroadcast) {
      const pendingRefundBroadcast = await getPendingBroadcast(failedSwap.refundBroadcast);
      refundEgressTrackerTxRef = pendingRefundBroadcast?.tx_ref;
    }
  } else if (
    swapRequest?.ignoredEgresses?.length ||
    egress?.broadcast?.abortedAt ||
    swapRequest?.fallbackEgress?.broadcast?.succeededAt ||
    swapRequest?.fallbackEgress?.broadcast?.abortedAt
  ) {
    state = StateV2.Failed;
  } else if (egress?.broadcast?.succeededAt) {
    state = StateV2.Completed;
  } else if (!egress && swapRequest?.completedAt) {
    state = StateV2.Completed;
  } else if (egress) {
    state = StateV2.Sending;
    if (swapEgress?.broadcast) {
      const pendingSwapBroadcast = await getPendingBroadcast(swapEgress.broadcast);
      if (pendingSwapBroadcast) {
        state = StateV2.Sent;
        swapEgressTrackerTxRef = pendingSwapBroadcast.tx_ref;
      }
    }
    if (refundEgress?.broadcast) {
      const pendingRefundBroadcast = await getPendingBroadcast(refundEgress.broadcast);
      if (pendingRefundBroadcast) {
        state = StateV2.Sent;
        refundEgressTrackerTxRef = pendingRefundBroadcast.tx_ref;
      }
    }
    if (fallbackEgress?.broadcast) {
      const pendingFallbackBroadcast = await getPendingBroadcast(fallbackEgress.broadcast);
      if (pendingFallbackBroadcast) {
        state = StateV2.Failed;
        fallbackEgressTrackerTxRef = pendingFallbackBroadcast.tx_ref;
      }
    }
  } else if (swapRequest?.swaps.some((s) => s.swapScheduledAt)) {
    state = StateV2.Swapping;
  } else {
    state = StateV2.Waiting;

    if (depositChannel) {
      pendingDeposit = await getPendingDeposit(
        depositChannel.srcAsset,
        depositChannel.depositAddress,
      );
      if (pendingDeposit) state = StateV2.Receiving;
    }
    if (pendingVaultSwap) state = StateV2.Receiving;
  }

  return {
    state,
    swapEgressTrackerTxRef,
    refundEgressTrackerTxRef,
    fallbackEgressTrackerTxRef,
    pendingDeposit,
  };
};

export const getBeneficiaries = (
  swapRequest: SwapRequestData | null | undefined,
  swapDepositChannel: SwapChannelData | null | undefined,
  pendingVaultSwap?: PendingVaultSwapData | null | undefined,
  accountCreationDepositChannel?: AccountCreationDepositChannelData | null | undefined,
) =>
  swapRequest?.beneficiaries ??
  swapDepositChannel?.beneficiaries ??
  accountCreationDepositChannel?.swapBeneficiaries ??
  (pendingVaultSwap &&
    [
      pendingVaultSwap.brokerFee && {
        type: 'SUBMITTER' as const,
        account: pendingVaultSwap.brokerFee.account,
        commissionBps: pendingVaultSwap.brokerFee.commissionBps,
      },
      ...pendingVaultSwap.affiliateFees.map((fee) => ({
        type: 'AFFILIATE' as const,
        account: fee.account,
        commissionBps: fee.commissionBps,
      })),
    ].filter(isTruthy));

export const getFillOrKillParams = (
  swapRequest: SwapRequestData | null | undefined,
  swapDepositChannel: SwapChannelData | null | undefined,
  pendingVaultSwap?: PendingVaultSwapData | null | undefined,
) => {
  const srcAsset = readField(swapRequest, swapDepositChannel, pendingVaultSwap, 'srcAsset');
  const destAsset = readField(swapRequest, swapDepositChannel, pendingVaultSwap, 'destAsset');
  const fokRefundAddress =
    readField(swapRequest, swapDepositChannel, 'fokRefundAddress') ??
    pendingVaultSwap?.refundParams?.refundAddress;
  const fokMinPriceX128 =
    readField(swapRequest, swapDepositChannel, 'fokMinPriceX128') ??
    (isNotNullish(pendingVaultSwap?.refundParams?.minPrice)
      ? new Prisma.Decimal(pendingVaultSwap.refundParams.minPrice.toString())
      : undefined);

  const fokRetryDurationBlocks =
    readField(swapRequest, swapDepositChannel, 'fokRetryDurationBlocks') ??
    pendingVaultSwap?.refundParams?.retryDuration;
  const fokMaxOraclePriceSlippageBps = readField(
    swapRequest,
    swapDepositChannel,
    'fokMaxOraclePriceSlippageBps',
  );

  return srcAsset && destAsset && isNotNullish(fokMinPriceX128)
    ? {
        refundAddress: fokRefundAddress,
        minPrice: getPriceFromPriceX128(fokMinPriceX128.toFixed(), srcAsset, destAsset),
        retryDurationBlocks: fokRetryDurationBlocks,
        maxOraclePriceSlippage: fokMaxOraclePriceSlippageBps,
      }
    : undefined;
};

export const getDcaParams = (
  requestOrChannel: SwapRequestData | SwapChannelData | null | undefined,
  pendingVaultSwap?: PendingVaultSwapData | null | undefined,
) => {
  const numberOfChunks =
    requestOrChannel?.dcaNumberOfChunks ?? pendingVaultSwap?.dcaParams?.numberOfChunks;
  const chunkIntervalBlocks =
    requestOrChannel?.dcaChunkIntervalBlocks ?? pendingVaultSwap?.dcaParams?.chunkInterval;

  return numberOfChunks && numberOfChunks > 1 ? { numberOfChunks, chunkIntervalBlocks } : undefined;
};

export const getCcmParams = (
  swapRequest: SwapRequestData | null | undefined,
  swapDepositChannel: SwapChannelData | null | undefined,
  pendingVaultSwap?: PendingVaultSwapData | null | undefined,
) => {
  const ccmGasBudget =
    readField(swapRequest, swapDepositChannel, 'ccmGasBudget') ??
    (isNotNullish(pendingVaultSwap?.ccmDepositMetadata?.channelMetadata.gasBudget)
      ? new Prisma.Decimal(pendingVaultSwap.ccmDepositMetadata.channelMetadata.gasBudget.toString())
      : undefined);

  const ccmMessage =
    readField(swapRequest, swapDepositChannel, 'ccmMessage') ??
    pendingVaultSwap?.ccmDepositMetadata?.channelMetadata.message;

  return ccmGasBudget || ccmMessage
    ? {
        gasBudget: ccmGasBudget?.toFixed(),
        message: ccmMessage,
      }
    : undefined;
};

type FeeAggregate = Map<
  `${SwapFee['type']}-${SwapFee['asset']}`,
  { asset: AssetSymbol; chain: AnyChainflipChain; type: SwapFee['type']; amount: Prisma.Decimal }
>;

export const rollupFees = (fees: SwapFee[], init: FeeAggregate) =>
  fees.reduce<FeeAggregate>((acc, fee) => {
    const key = `${fee.type}-${fee.asset}` as const;
    let agg = acc.get(key);
    if (!agg) {
      agg = {
        ...anyInternalAssetToRpcAsset[fee.asset],
        type: fee.type,
        amount: new Prisma.Decimal(0),
      };
      acc.set(key, agg);
    }
    agg.amount = agg.amount.plus(fee.amount);
    return acc;
  }, init);

export const getRolledSwapsInitialData = (swapRequest: SwapRequestData | undefined | null) => ({
  swappedOutputAmount: new Prisma.Decimal(0),
  swappedIntermediateAmount: new Prisma.Decimal(0),
  swappedInputAmount: new Prisma.Decimal(0),
  executedChunks: 0,
  previousChunk: null as null | NonNullable<SwapRequestData['swaps']>[number],
  currentChunk: null as null | NonNullable<SwapRequestData['swaps']>[number],
  lastExecutedChunk: null as null | NonNullable<SwapRequestData['swaps']>[number],
  isDca: (swapRequest?.dcaNumberOfChunks ?? 1) > 1,
  fees: new Map() as FeeAggregate,
});

export const getDepositChannelInfo = (
  swapDepositChannel: SwapChannelData | null | undefined,
  accountCreationDepositChannel: AccountCreationDepositChannelData | null | undefined,
) => {
  if (swapDepositChannel) {
    return {
      id: `${swapDepositChannel.issuedBlock}-${swapDepositChannel.srcChain}-${swapDepositChannel.channelId}`,
      createdAt: swapDepositChannel.createdAt.valueOf(),
      /** @deprecated DEPRECATED(2.0): remove field */
      brokerCommissionBps:
        swapDepositChannel.beneficiaries.find(({ type }) => type === 'SUBMITTER')?.commissionBps ??
        0,
      depositAddress: swapDepositChannel.depositAddress,
      srcChainExpiryBlock: swapDepositChannel.srcChainExpiryBlock?.toString(),
      estimatedExpiryTime: swapDepositChannel.estimatedExpiryAt?.valueOf(),
      expectedDepositAmount: swapDepositChannel.expectedDepositAmount?.toFixed(),
      isExpired: swapDepositChannel.isExpired,
      openedThroughBackend: swapDepositChannel.openedThroughBackend,
      /** @deprecated DEPRECATED(2.0): remove field */
      affiliateBrokers:
        swapDepositChannel.beneficiaries
          .filter(({ type }) => type === 'AFFILIATE')
          .map(({ account, commissionBps }) => ({ account, commissionBps })) ?? [],
      /** @deprecated DEPRECATED(2.0): remove field */
      fillOrKillParams: getFillOrKillParams(null, swapDepositChannel),
      dcaParams: getDcaParams(swapDepositChannel),
    };
  }

  if (accountCreationDepositChannel) {
    return {
      id: `${accountCreationDepositChannel.issuedBlock}-${accountCreationDepositChannel.chain}-${accountCreationDepositChannel.channelId}`,
      createdAt: accountCreationDepositChannel.createdAt.valueOf(),
      depositAddress: accountCreationDepositChannel.depositAddress,
      srcChainExpiryBlock: accountCreationDepositChannel.depositChainExpiryBlock?.toString(),
      estimatedExpiryTime: accountCreationDepositChannel.estimatedExpiryAt?.valueOf(),
      isExpired: accountCreationDepositChannel.isExpired,
      openedThroughBackend: accountCreationDepositChannel.openedThroughBackend,
      liquidityProvider: accountCreationDepositChannel.lpAccountId,
    };
  }

  throw new Error('No deposit channel info available');
};
