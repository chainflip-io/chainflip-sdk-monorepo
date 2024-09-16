import { getAssetAndChain } from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import { StateV2 } from './swap';
import prisma, {
  Prisma,
  Swap,
  Egress,
  Broadcast,
  SwapFee,
  IgnoredEgress,
  FailedSwap,
} from '../../client';
import { getPendingBroadcast } from '../../ingress-egress-tracking';
import { failedSwapMessage, FailureMode } from '../../utils/swap';

export const depositChannelInclude = {
  failedBoosts: true,
  failedSwaps: true,
  affiliates: {
    select: {
      account: true,
      commissionBps: true,
    },
  },
} as const;

export const swapRequestInclude = {
  swaps: { include: { fees: true }, orderBy: { nativeId: 'desc' } },
  egress: { include: { broadcast: true } },
  refundEgress: { include: { broadcast: true } },
  fees: true,
  ignoredEgresses: true,
  swapDepositChannel: {
    include: depositChannelInclude,
  },
} as const;

export const getSwapFields = (swap: Swap & { fees: SwapFee[] }) => ({
  swapInputAmount: swap.swapInputAmount.toString(),
  swapOutputAmount: swap.swapOutputAmount?.toString(),
  scheduledAt: swap.swapScheduledAt.valueOf(),
  scheduledBlockIndex: swap.swapScheduledBlockIndex ?? undefined,
  executedAt: swap.swapExecutedAt?.valueOf(),
  executedBlockIndex: swap.swapExecutedBlockIndex ?? undefined,
  retryCount: swap.retryCount,
  latestSwapRescheduledAt: swap.latestSwapRescheduledAt?.valueOf(),
  latestSwapRescheduledBlockIndex: swap.latestSwapRescheduledBlockIndex ?? undefined,
  fees: swap.fees.map((fee) => ({
    type: fee.type,
    ...getAssetAndChain(fee.asset),
    amount: fee.amount.toString(),
  })),
});

export const getDepositIgnoredFailedState = (failedSwap: FailedSwap) => ({
  failedAt: failedSwap.failedAt.valueOf(),
  failedAtBlockIndex: failedSwap.failedBlockIndex,
  mode: FailureMode.IngressIgnored,
  reason: {
    name: failedSwap.reason,
    message: failedSwapMessage[failedSwap.reason],
  },
});

export const getEgressFailureState = async (
  ignoredEgress: IgnoredEgress | undefined,
  broadcast: Broadcast | null | undefined,
  type: IgnoredEgress['type'] | undefined,
) => {
  const abortedBroadcast = broadcast?.abortedAt?.valueOf();
  const failedAt = abortedBroadcast ?? ignoredEgress?.ignoredAt?.valueOf();
  const failedAtBlockIndex = broadcast?.abortedBlockIndex ?? ignoredEgress?.ignoredBlockIndex;

  let error;
  let failureMode;

  if (failedAt && failedAtBlockIndex) {
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
      failedAtBlockIndex,
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
      confirmedAt: broadcast?.succeededAt?.valueOf(),
      confirmedBlockIndex: broadcast?.succeededBlockIndex ?? undefined,
      txRef: broadcast?.transactionRef ?? egressTrackerTxRef,
      failedAt: broadcast?.abortedAt?.valueOf(),
      failedBlockIndex: broadcast?.abortedBlockIndex ?? undefined,
    }),
    ...(failureState && { failure: failureState }),
    ...(ignoredEgress && {
      ignoredAmount: ignoredEgress.amount?.toFixed(),
      failedAt: ignoredEgress.ignoredAt?.valueOf(),
      failedBlockIndex: ignoredEgress.ignoredBlockIndex,
    }),
  };
};

export const getSwapState = async (
  failedSwap: FailedSwap | null | undefined,
  ignoredEgresses: IgnoredEgress[] | undefined,
  swapRequest:
    | Prisma.SwapRequestGetPayload<{
        include: typeof swapRequestInclude;
      }>
    | undefined
    | null,
) => {
  let state: StateV2 | undefined;
  let swapEgressTrackerTxRef: string | null | undefined;
  let refundEgressTrackerTxRef: string | null | undefined;
  const swapEgress = swapRequest?.egress;
  const refundEgress = swapRequest?.refundEgress;
  const egress = swapEgress ?? refundEgress;

  if (
    failedSwap ||
    (ignoredEgresses && ignoredEgresses.length > 0) ||
    egress?.broadcast?.abortedAt
  ) {
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
    state = StateV2.Receiving;
  }

  return {
    state,
    swapEgressTrackerTxRef,
    refundEgressTrackerTxRef,
  };
};
