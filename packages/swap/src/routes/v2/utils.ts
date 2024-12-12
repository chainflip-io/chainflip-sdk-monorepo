import { assertUnreachable } from '@/shared/functions';
import { readField } from '@/swap/utils/function';
import logger from '@/swap/utils/logger';
import ServiceError from '@/swap/utils/ServiceError';
import { StateV2 } from './swap';
import prisma, {
  Swap,
  Egress,
  Broadcast,
  SwapFee,
  IgnoredEgress,
  FailedSwap,
  SwapRequest,
} from '../../client';
import {
  getPendingBroadcast,
  getPendingDeposit,
  PendingDeposit,
} from '../../ingress-egress-tracking';
import { coerceChain, failedSwapMessage, FailureMode } from '../../utils/swap';

const depositChannelInclude = {
  failedBoosts: true,
  failedSwaps: true,
  affiliates: {
    select: {
      account: true,
      commissionBps: true,
    },
  },
} as const;

const swapRequestInclude = {
  swaps: { include: { fees: true }, orderBy: { nativeId: 'asc' } },
  egress: { include: { broadcast: true } },
  refundEgress: { include: { broadcast: true } },
  fees: true,
  ignoredEgresses: true,
  swapDepositChannel: {
    include: depositChannelInclude,
  },
} as const;

const channelIdRegex = /^(?<issuedBlock>\d+)-(?<srcChain>[a-z]+)-(?<channelId>\d+)$/i;
const swapRequestIdRegex = /^\d+$/i;

export const getLatestSwapForId = async (id: string) => {
  let swapRequest;
  let failedSwap;
  let swapDepositChannel;
  let affiliateBrokers;

  if (channelIdRegex.test(id)) {
    const { issuedBlock, srcChain, channelId } = channelIdRegex.exec(id)!.groups!;

    swapDepositChannel = await prisma.swapDepositChannel.findUnique({
      where: {
        issuedBlock_srcChain_channelId: {
          issuedBlock: Number(issuedBlock),
          srcChain: coerceChain(srcChain),
          channelId: BigInt(channelId),
        },
      },
      include: {
        swapRequests: { include: swapRequestInclude, orderBy: { nativeId: 'desc' } },
        failedSwaps: {
          include: {
            swapDepositChannel: { include: depositChannelInclude },
            refundBroadcast: true,
          },
        },
        failedBoosts: true,
        affiliates: {
          select: {
            account: true,
            commissionBps: true,
          },
        },
      },
    });

    if (!swapDepositChannel) {
      logger.info(`could not find swap request with id "${id}"`);
      throw ServiceError.notFound();
    }

    swapRequest = swapDepositChannel.swapRequests.at(0);
    // swap request will have no swaps for failed ccm swaps: https://scan.chainflip.io/blocks/4716217
    if (!swapRequest || (swapRequest.completedAt && !swapRequest.swaps.length)) {
      failedSwap = swapDepositChannel.failedSwaps.at(0);
    }
  } else if (swapRequestIdRegex.test(id)) {
    swapRequest = await prisma.swapRequest.findUnique({
      where: { nativeId: BigInt(id) },
      include: swapRequestInclude,
    });
  } else if (id) {
    swapRequest = await prisma.swapRequest.findFirst({
      where: { depositTransactionRef: { equals: id, mode: 'insensitive' } },
      include: swapRequestInclude,
      // just get the last one for now
      orderBy: { nativeId: 'desc' },
      take: 1,
    });
    if (!swapRequest) {
      failedSwap = await prisma.failedSwap.findFirst({
        where: { depositTransactionRef: { equals: id, mode: 'insensitive' } },
        include: { swapDepositChannel: { include: depositChannelInclude }, refundBroadcast: true },
      });
    }
  }

  swapDepositChannel ??= swapRequest?.swapDepositChannel ?? failedSwap?.swapDepositChannel;
  if (swapDepositChannel && swapDepositChannel.affiliates.length > 0) {
    affiliateBrokers = swapDepositChannel.affiliates;
  }

  ServiceError.assert(
    swapDepositChannel || swapRequest || failedSwap,
    'notFound',
    'resource not found',
  );

  return {
    swapRequest,
    failedSwap,
    swapDepositChannel,
    affiliateBrokers,
  };
};

type LatestSwapData = Awaited<ReturnType<typeof getLatestSwapForId>>;

type SwapRequestData = NonNullable<LatestSwapData['swapRequest']>;
type FailedSwapData = NonNullable<LatestSwapData['failedSwap']>;
type SwapChannelData = NonNullable<LatestSwapData['swapDepositChannel']>;

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
});

const getDepositIgnoredFailedState = (failedSwap: FailedSwap) => ({
  failedAt: failedSwap.failedAt.valueOf(),
  failedBlockIndex: failedSwap.failedBlockIndex,
  mode: failedSwap.refundBroadcastId
    ? FailureMode.TransactionRejectedByBroker
    : FailureMode.IngressIgnored,
  reason: {
    name: failedSwap.reason,
    message: failedSwapMessage[failedSwap.reason],
  },
});

export const getDepositInfo = (
  swapRequest: SwapRequest | null | undefined,
  failedSwap: FailedSwap | null | undefined,
  pendingDeposit: PendingDeposit | null | undefined,
) => {
  const amount =
    readField(swapRequest, failedSwap, 'depositAmount')?.toFixed() ?? pendingDeposit?.amount;
  const depositTransactionRef =
    swapRequest?.depositTransactionRef ??
    pendingDeposit?.transactionHash ??
    failedSwap?.depositTransactionRef ??
    undefined;

  if (!amount) return null;

  return {
    deposit: {
      amount,
      txRef: depositTransactionRef,
      txConfirmations: pendingDeposit?.transactionConfirmations,
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
        failure: getDepositIgnoredFailedState(failedSwap),
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

export const getEgressStatusFields = async (
  egress: Egress | null | undefined,
  broadcast: Broadcast | null | undefined,
  ignoredEgresses: IgnoredEgress[] | undefined,
  type: IgnoredEgress['type'] | undefined,
  egressTrackerTxRef: string | null | undefined,
) => {
  const ignoredEgress = ignoredEgresses?.find((e) => e.type === type);
  const failureState = await getEgressFailureState(ignoredEgress, broadcast, type);
  if (!egress && !broadcast && !failureState && !ignoredEgress) return null;
  return {
    ...(egress && {
      amount: egress.amount?.toFixed(),
      scheduledAt: egress.scheduledAt?.valueOf(),
      scheduledBlockIndex: egress.scheduledBlockIndex ?? undefined,
    }),
    ...(broadcast && {
      witnessedAt: broadcast?.succeededAt?.valueOf(),
      witnessedBlockIndex: broadcast?.succeededBlockIndex ?? undefined,
      txRef: broadcast?.transactionRef ?? egressTrackerTxRef,
      failedAt: broadcast?.abortedAt?.valueOf(),
      failedBlockIndex: broadcast?.abortedBlockIndex ?? undefined,
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
  ignoredEgresses: IgnoredEgress[] | undefined,
  swapRequest: SwapRequestData | undefined | null,
  depositChannel: SwapChannelData | null | undefined,
): Promise<{
  state: StateV2;
  swapEgressTrackerTxRef: string | null | undefined;
  refundEgressTrackerTxRef: string | null | undefined;
  pendingDeposit: PendingDeposit | null;
}> => {
  let state: StateV2 | undefined;
  let swapEgressTrackerTxRef: string | null | undefined;
  let refundEgressTrackerTxRef: string | null | undefined;
  let pendingDeposit = null;
  const swapEgress = swapRequest?.egress;
  const refundEgress = swapRequest?.refundEgress;
  const egress = swapEgress ?? refundEgress;

  if (failedSwap) {
    state = StateV2.Failed;
    if (failedSwap.refundBroadcast) {
      const pendingRefundBroadcast = await getPendingBroadcast(failedSwap.refundBroadcast);
      refundEgressTrackerTxRef = pendingRefundBroadcast?.tx_ref;
    }
  } else if ((ignoredEgresses && ignoredEgresses.length > 0) || egress?.broadcast?.abortedAt) {
    state = StateV2.Failed;
  } else if (egress?.broadcast?.succeededAt) {
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
  }

  return {
    state,
    swapEgressTrackerTxRef,
    refundEgressTrackerTxRef,
    pendingDeposit,
  };
};

export const getDcaParams = (
  swapRequest: Awaited<ReturnType<typeof getLatestSwapForId>>['swapRequest'],
  swapDepositChannel: Awaited<ReturnType<typeof getLatestSwapForId>>['swapDepositChannel'],
) =>
  swapRequest?.chunkIntervalBlocks || swapDepositChannel?.chunkIntervalBlocks
    ? {
        numberOfChunks: swapRequest?.numberOfChunks ?? swapDepositChannel?.numberOfChunks,
        chunkIntervalBlocks:
          swapRequest?.chunkIntervalBlocks ?? swapDepositChannel?.chunkIntervalBlocks,
      }
    : undefined;
