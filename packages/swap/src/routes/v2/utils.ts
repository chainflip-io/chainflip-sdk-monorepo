import { CHARSET } from '@chainflip/utils/base58';
import { assertUnreachable, getPriceFromPriceX128 } from '@/shared/functions';
import { isNotNullish } from '@/shared/guards';
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
  Prisma,
} from '../../client';
import env from '../../config/env';
import {
  getPendingBroadcast,
  getPendingDeposit,
  getPendingVaultSwap,
  PendingDeposit,
} from '../../ingress-egress-tracking';
import { coerceChain, failedSwapMessage, FailureMode } from '../../utils/swap';

const failedSwapInclude = { refundBroadcast: true } as const;

const depositChannelInclude = {
  failedBoosts: true,
  failedSwaps: { select: failedSwapInclude },
  beneficiaries: {
    select: {
      type: true,
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
const hexRegex = /^(0x)?[a-f0-9]+$/i;
const base58Regex = new RegExp(`^[${CHARSET}]+$`);
const dotRegex = /^\d+-\d+$/;

const isTransactionRef = (id: string) =>
  hexRegex.test(id) || base58Regex.test(id) || dotRegex.test(id);

export const getLatestSwapForId = async (id: string) => {
  let swapRequest;
  let failedSwap;
  let swapDepositChannel;
  let beneficiaries;
  let swapEgress;
  let refundEgress;
  let ignoredEgresses;
  let pendingVaultSwap;

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
            ...failedSwapInclude,
          },
        },
        failedBoosts: true,
        beneficiaries: {
          select: {
            type: true,
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
  } else if (isTransactionRef(id)) {
    swapRequest = await prisma.swapRequest.findFirst({
      where: { depositTransactionRef: id },
      include: swapRequestInclude,
      // just get the last one for now
      orderBy: { nativeId: 'desc' },
      take: 1,
    });
    if (!swapRequest) {
      failedSwap = await prisma.failedSwap.findFirst({
        where: { depositTransactionRef: id },
        include: { swapDepositChannel: { include: depositChannelInclude }, ...failedSwapInclude },
      });
    }
    pendingVaultSwap = await getPendingVaultSwap(env.CHAINFLIP_NETWORK, id);
  }

  swapDepositChannel ??= swapRequest?.swapDepositChannel ?? failedSwap?.swapDepositChannel;
  if (swapDepositChannel && swapDepositChannel.beneficiaries.length > 0) {
    beneficiaries = swapDepositChannel.beneficiaries;
  }

  if (swapRequest) {
    swapEgress = swapRequest?.egress;
    refundEgress = swapRequest?.refundEgress;
    ignoredEgresses = swapRequest?.ignoredEgresses;
  } else if (failedSwap?.refundBroadcast) {
    // rejected deposits don't have an egress, but the downstream logic is simplified
    // if it has a fake egress
    refundEgress = {
      amount: failedSwap.depositAmount,
      scheduledAt: failedSwap.refundBroadcast.requestedAt,
      scheduledBlockIndex: failedSwap.refundBroadcast.requestedBlockIndex,
      broadcastId: failedSwap.refundBroadcast.nativeId,
      broadcast: failedSwap.refundBroadcast,
      chain: failedSwap.srcChain,
      nativeId: 0n,
      id: 0n,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  ServiceError.assert(
    swapDepositChannel || swapRequest || failedSwap || pendingVaultSwap,
    'notFound',
    'resource not found',
  );

  return {
    swapRequest,
    failedSwap,
    swapDepositChannel,
    beneficiaries,
    swapEgress,
    refundEgress,
    ignoredEgresses,
    pendingVaultSwap,
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
  pendingVaultSwap: Awaited<ReturnType<typeof getLatestSwapForId>>['pendingVaultSwap'],
) => {
  const amount =
    readField(swapRequest, failedSwap, 'depositAmount')?.toFixed() ??
    pendingDeposit?.amount ??
    (isNotNullish(pendingVaultSwap?.amount) ? pendingVaultSwap.amount.toString() : undefined);

  const depositTransactionRef =
    swapRequest?.depositTransactionRef ??
    pendingDeposit?.transactionHash ??
    failedSwap?.depositTransactionRef ??
    pendingVaultSwap?.txId ??
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

export const getEgressStatusFields = async (
  egress: (Egress & { broadcast: Broadcast | null }) | null | undefined,
  ignoredEgresses: IgnoredEgress[] | undefined,
  type: IgnoredEgress['type'] | undefined,
  egressTrackerTxRef: string | null | undefined,
) => {
  const broadcast = egress?.broadcast;
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
  pendingVaultSwap: Awaited<ReturnType<typeof getLatestSwapForId>>['pendingVaultSwap'],
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
    if (pendingVaultSwap) state = StateV2.Receiving;
  }

  return {
    state,
    swapEgressTrackerTxRef,
    refundEgressTrackerTxRef,
    pendingDeposit,
  };
};

export const getFillOrKillParams = (
  swapRequest: Awaited<ReturnType<typeof getLatestSwapForId>>['swapRequest'],
  swapDepositChannel: Awaited<ReturnType<typeof getLatestSwapForId>>['swapDepositChannel'],
  pendingVaultSwap?: Awaited<ReturnType<typeof getLatestSwapForId>>['pendingVaultSwap'],
) => {
  const srcAsset =
    readField(swapRequest, swapDepositChannel, 'srcAsset') ?? pendingVaultSwap?.inputAsset;
  const destAsset =
    readField(swapRequest, swapDepositChannel, 'destAsset') ?? pendingVaultSwap?.outputAsset;
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

  return srcAsset && destAsset && isNotNullish(fokMinPriceX128)
    ? {
        refundAddress: fokRefundAddress,
        minPrice: getPriceFromPriceX128(fokMinPriceX128.toFixed(), srcAsset, destAsset),
        retryDurationBlocks: fokRetryDurationBlocks,
      }
    : undefined;
};

export const getDcaParams = (
  swapRequest: Awaited<ReturnType<typeof getLatestSwapForId>>['swapRequest'],
  swapDepositChannel: Awaited<ReturnType<typeof getLatestSwapForId>>['swapDepositChannel'],
  pendingVaultSwap?: Awaited<ReturnType<typeof getLatestSwapForId>>['pendingVaultSwap'],
) =>
  swapRequest?.dcaChunkIntervalBlocks ||
  swapDepositChannel?.dcaChunkIntervalBlocks ||
  pendingVaultSwap?.dcaParams
    ? {
        numberOfChunks:
          swapRequest?.dcaNumberOfChunks ??
          swapDepositChannel?.dcaNumberOfChunks ??
          pendingVaultSwap?.dcaParams?.numberOfChunks,
        chunkIntervalBlocks:
          swapRequest?.dcaChunkIntervalBlocks ??
          swapDepositChannel?.dcaChunkIntervalBlocks ??
          pendingVaultSwap?.dcaParams?.chunkInterval,
      }
    : undefined;

export const getCcmParams = (
  swapRequest: Awaited<ReturnType<typeof getLatestSwapForId>>['swapRequest'],
  swapDepositChannel: Awaited<ReturnType<typeof getLatestSwapForId>>['swapDepositChannel'],
  pendingVaultSwap: Awaited<ReturnType<typeof getLatestSwapForId>>['pendingVaultSwap'],
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

export const getRolledSwapsInitialData = (
  swapDepositChannel: SwapChannelData | null | undefined,
) => ({
  swappedOutputAmount: new Prisma.Decimal(0),
  swappedIntermediateAmount: new Prisma.Decimal(0),
  swappedInputAmount: new Prisma.Decimal(0),
  executedChunks: 0,
  currentChunk: null as null | NonNullable<SwapRequestData['swaps']>[number],
  lastExecutedChunk: null as null | NonNullable<SwapRequestData['swaps']>[number],
  isDca: Boolean(
    swapDepositChannel?.dcaChunkIntervalBlocks && swapDepositChannel.dcaChunkIntervalBlocks > 1,
  ),
  fees: [] as SwapFee[],
});
