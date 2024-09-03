import express from 'express';
import { assetConstants, getAssetAndChain } from '@/shared/enums';
import { assertUnreachable, getPriceFromPriceX128 } from '@/shared/functions';
import { getRequiredBlockConfirmations } from '@/swap/utils/rpc';
import prisma, { Prisma, Swap, Egress, Broadcast, SwapFee, IgnoredEgress } from '../../client';
import { getPendingBroadcast, getPendingDeposit } from '../../ingress-egress-tracking';
import { readField } from '../../utils/function';
import logger from '../../utils/logger';
import ServiceError from '../../utils/ServiceError';
import {
  channelIdRegex,
  coerceChain,
  swapRequestId,
  txHashRegex,
  estimateSwapDuration,
  isEgressableSwap,
  failedSwapMessage,
} from '../../utils/swap';
import { asyncHandler } from '../common';
import { Failure } from '../swap';

const router = express.Router();

export enum StateV2 {
  Failed = 'FAILED',
  Complete = 'COMPLETE',
  Broadcasted = 'BROADCASTED',
  EgressScheduled = 'EGRESS_SCHEDULED',
  Swapping = 'SWAPPING',
  DepositReceived = 'DEPOSIT_RECEIVED',
  AwaitingDeposit = 'AWAITING_DEPOSIT',
}

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
  swaps: { include: { fees: true }, orderBy: { nativeId: 'desc' } },
  egress: { include: { broadcast: true } },
  refundEgress: { include: { broadcast: true } },
  fees: true,
  ignoredEgresses: true,
  swapDepositChannel: {
    include: depositChannelInclude,
  },
} as const;

const getSwapFields = (swap: Swap & { fees: SwapFee[] }) => ({
  swapInputAmount: swap.swapInputAmount.toString(),
  swapOutputAmount: swap.swapOutputAmount?.toString(),
  scheduledAt: swap.swapScheduledAt,
  scheduledBlockIndex: swap.swapScheduledBlockIndex ?? undefined,
  executedAt: swap.swapExecutedAt,
  executedBlockIndex: swap.swapExecutedBlockIndex ?? undefined,
  retryCount: swap.retryCount,
  latestSwapRescheduledAt: swap.latestSwapRescheduledAt,
  latestSwapRescheduledBlockIndex: swap.latestSwapRescheduledBlockIndex ?? undefined,
  fees: swap.fees.map((fee) => ({
    type: fee.type,
    ...getAssetAndChain(fee.asset),
    amount: fee.amount.toString(),
  })),
});

const getEgressFields = (
  egress: Egress,
  ignoredEgresses: IgnoredEgress[] | undefined,
  type: IgnoredEgress['type'],
) => ({
  amount: egress?.amount?.toFixed(),
  scheduledAt: egress?.scheduledAt?.valueOf(),
  scheduledBlockIndex: egress?.scheduledBlockIndex ?? undefined,
  ignoredAt: ignoredEgresses?.find((e) => e.type === type)?.ignoredAt?.valueOf(),
  ignoredBlockIndex: ignoredEgresses?.find((e) => e.type === type)?.ignoredBlockIndex,
  ignoredAmount: ignoredEgresses?.find((e) => e.type === type)?.amount?.toFixed(),
});

const getBroadcastFields = (
  broadcast: Broadcast,
  egressTrackerTxRef: string | null | undefined,
) => ({
  requestedAt: broadcast?.requestedAt?.valueOf(),
  requestedBlockIndex: broadcast?.requestedBlockIndex ?? undefined,
  abortedAt: broadcast?.abortedAt?.valueOf(),
  abortedBlockIndex: broadcast?.abortedBlockIndex ?? undefined,
  succeededAt: broadcast?.succeededAt?.valueOf(),
  succeededBlockIndex: broadcast?.succeededBlockIndex ?? undefined,
  txRef: broadcast?.transactionRef ?? egressTrackerTxRef,
});

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

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
          swapRequests: { include: swapRequestInclude },
          failedSwaps: { include: { swapDepositChannel: { include: depositChannelInclude } } },
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
      failedSwap = swapDepositChannel.failedSwaps.at(0);
      if (swapDepositChannel.affiliates.length > 0) {
        affiliateBrokers = swapDepositChannel.affiliates;
      }
    } else if (swapRequestId.test(id)) {
      swapRequest = await prisma.swapRequest.findUnique({
        where: { nativeId: BigInt(id) },
        include: swapRequestInclude,
      });
    } else if (txHashRegex.test(id)) {
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
          include: { swapDepositChannel: { include: depositChannelInclude } },
        });
      }
    }

    swapDepositChannel ??= swapRequest?.swapDepositChannel ?? failedSwap?.swapDepositChannel;

    ServiceError.assert(
      swapDepositChannel || swapRequest || failedSwap,
      'notFound',
      'resource not found',
    );

    let state: StateV2 | undefined;
    let failureMode;
    let swapEgressTrackerTxRef;
    let refundEgressTrackerTxRef;
    let error: { name: string; message: string } | undefined;

    const swapEgress = swapRequest?.egress;
    const refundEgress = swapRequest?.refundEgress;
    const ignoredEgresses = swapRequest?.ignoredEgresses;
    const egress = swapEgress ?? refundEgress;
    const hasIgnoredEgresses =
      swapRequest?.ignoredEgresses && swapRequest.ignoredEgresses.length > 0;
    const hasAbortedBroadcasts = egress?.broadcast?.abortedAt;

    if (failedSwap || hasIgnoredEgresses || hasAbortedBroadcasts) {
      error = {
        name: 'Unknown',
        message: 'An unknown error occurred',
      };
      state = StateV2.Failed;

      if (failedSwap) {
        failureMode = Failure.IngressIgnored;
        error = {
          name: failedSwap.reason,
          message: failedSwapMessage[failedSwap.reason],
        };
      } else if (swapRequest?.ignoredEgresses && swapRequest.ignoredEgresses.length > 0) {
        if (swapRequest.ignoredEgresses.length > 1) failureMode = Failure.MultipleEgressIgnored;
        const ignored = swapRequest.ignoredEgresses.at(0)!;
        switch (ignored.type) {
          case 'REFUND':
            failureMode = Failure.RefundEgressIgnored;
            break;
          case 'SWAP':
            failureMode = Failure.EgressIgnored;
            break;
          default:
            assertUnreachable(ignored.type);
        }
        const [stateChainError] = await Promise.all([
          prisma.stateChainError.findUniqueOrThrow({
            where: { id: swapRequest.ignoredEgresses.at(0)!.stateChainErrorId },
          }),
        ]);
        error = {
          name: stateChainError.name,
          message: stateChainError.docs,
        };
      } else if (hasAbortedBroadcasts) {
        failureMode = Failure.BroadcastAborted;
      }
    } else if (egress?.broadcast?.succeededAt) {
      state = StateV2.Complete;
    } else if (egress?.broadcast) {
      if (swapEgress?.broadcast) {
        const pendingSwapBroadcast = await getPendingBroadcast(swapEgress.broadcast);
        if (pendingSwapBroadcast) {
          state = StateV2.Broadcasted;
          swapEgressTrackerTxRef = pendingSwapBroadcast.tx_ref;
        }
      }
      if (refundEgress?.broadcast) {
        const pendingRefundBroadcast = await getPendingBroadcast(refundEgress.broadcast);
        if (pendingRefundBroadcast) {
          state = StateV2.Broadcasted;
          refundEgressTrackerTxRef = pendingRefundBroadcast.tx_ref;
        }
      }
    } else if (egress) {
      state = StateV2.EgressScheduled;
    } else if (swapRequest?.swaps.some((s) => s.swapScheduledAt)) {
      state = StateV2.Swapping;
    } else if (swapRequest?.depositReceivedAt) {
      state = StateV2.DepositReceived;
    } else {
      state = StateV2.AwaitingDeposit;
    }

    const internalSrcAsset = readField(swapRequest, swapDepositChannel, failedSwap, 'srcAsset');
    const internalDestAsset = readField(swapRequest, swapDepositChannel, 'destAsset');

    let pendingDeposit;
    if (
      internalSrcAsset &&
      state === StateV2.AwaitingDeposit &&
      swapDepositChannel?.depositAddress
    ) {
      pendingDeposit = await getPendingDeposit(
        assetConstants[internalSrcAsset].chain,
        assetConstants[internalSrcAsset].asset,
        swapDepositChannel.depositAddress,
      );
    }

    let ccmParams;
    if (readField(swapRequest, swapDepositChannel, 'ccmGasBudget')) {
      ccmParams = {
        gasBudget: readField(swapRequest, swapDepositChannel, 'ccmGasBudget')?.toFixed(),
        message: readField(swapRequest, swapDepositChannel, 'ccmMessage'),
      };
    }

    let effectiveBoostFeeBps;

    if (swapDepositChannel && swapDepositChannel.maxBoostFeeBps > 0) {
      if (swapRequest) {
        effectiveBoostFeeBps = swapRequest.effectiveBoostFeeBps ?? undefined;
      } else if (swapDepositChannel.failedBoosts.length > 0) {
        effectiveBoostFeeBps = 0;
      }
    }
    const { srcAsset, destAsset } = {
      srcAsset: swapDepositChannel?.srcAsset || swapRequest?.srcAsset,
      destAsset: swapDepositChannel?.destAsset || swapRequest?.destAsset,
    };

    const depositTransactionRef =
      swapRequest?.depositTransactionRef ??
      pendingDeposit?.transactionHash ??
      failedSwap?.depositTransactionRef ??
      undefined;

    const sortedSwaps = swapRequest?.swaps.filter(isEgressableSwap).sort((a, b) => {
      if (a.swapExecutedAt && b.swapExecutedAt) {
        return a.swapExecutedAt.valueOf() - b.swapExecutedAt.valueOf() ? 1 : -1;
      }
      return a.swapExecutedAt && !b.swapExecutedAt ? 1 : 0;
    });
    const rolledSwaps = sortedSwaps?.reduce(
      (acc, curr) => {
        acc.totalAmountSwapped = acc.totalAmountSwapped.plus(curr.swapOutputAmount ?? 0);
        if (curr.swapScheduledAt && curr.swapExecutedAt) {
          acc.lastExecutedChunk = curr;
          acc.totalChunksExecuted += 1;
        }
        return acc;
      },
      {
        totalAmountSwapped: new Prisma.Decimal(0),
        totalChunksExecuted: 0,
        currentChunk: sortedSwaps[0],
        lastExecutedChunk: null as null | (typeof sortedSwaps)[number],
        isDcaSwap:
          swapDepositChannel?.chunkIntervalBlocks && swapDepositChannel.chunkIntervalBlocks > 1,
      },
    );

    // const fees = (swapRequest?.fees ?? []).concat(swap?.fees ?? []); // handle fees after broker fee refactor

    const response = {
      state,
      ...(internalSrcAsset && getAssetAndChain(internalSrcAsset, 'src')),
      ...(internalDestAsset && getAssetAndChain(internalDestAsset, 'dest')),
      depositChannel: {
        destAddress: readField(swapRequest, swapDepositChannel, failedSwap, 'destAddress'),
        createdAt: swapDepositChannel?.createdAt.valueOf(),
        brokerCommissionBps: swapDepositChannel?.brokerCommissionBps,
        depositAddress: swapDepositChannel?.depositAddress,
        expectedDepositAmount: swapDepositChannel?.expectedDepositAmount?.toFixed(),
        expiryBlock: swapDepositChannel?.srcChainExpiryBlock?.toString(),
        estimatedExpiryTime: swapDepositChannel?.estimatedExpiryAt?.valueOf(),
        isExpired: swapDepositChannel?.isExpired,
        openedThroughBackend: swapDepositChannel?.openedThroughBackend,
        affiliateBrokers,
        fillOrKillParams: swapDepositChannel?.fokMinPriceX128
          ? {
              retryDurationBlocks: swapDepositChannel.fokRetryDurationBlocks,
              refundAddress: swapDepositChannel.fokRefundAddress,
              minPrice: getPriceFromPriceX128(
                swapDepositChannel.fokMinPriceX128.toFixed(),
                swapDepositChannel.srcAsset,
                swapDepositChannel.destAsset,
              ),
            }
          : undefined,
        dcaParams: swapDepositChannel?.chunkIntervalBlocks
          ? {
              numberOfChunks: swapDepositChannel?.numberOfChunks,
              chunkIntervalBlocks: swapDepositChannel?.chunkIntervalBlocks,
            }
          : undefined,
      },
      deposit: {
        amount:
          readField(swapRequest, failedSwap, 'depositAmount')?.toFixed() ?? pendingDeposit?.amount,
        transactionRef: depositTransactionRef,
        txConfirmations: pendingDeposit?.transactionConfirmations,
        receivedAt: swapRequest?.depositReceivedAt?.valueOf(),
        receivedBlockIndex: swapRequest?.depositReceivedBlockIndex ?? undefined,
      },
      swap: {
        ...rolledSwaps,
        currentChunk: rolledSwaps && getSwapFields(rolledSwaps.currentChunk),
        egress: swapEgress ? getEgressFields(swapEgress, ignoredEgresses, 'SWAP') : undefined,
        broadcast: swapEgress?.broadcast
          ? getBroadcastFields(swapEgress.broadcast, swapEgressTrackerTxRef)
          : undefined,
        srcChainRequiredBlockConfirmations:
          (internalSrcAsset && (await getRequiredBlockConfirmations(internalSrcAsset))) ??
          undefined,
        estimatedDefaultDurationSeconds:
          srcAsset && destAsset && (await estimateSwapDuration({ srcAsset, destAsset })),
      },
      refund: {
        egress: refundEgress ? getEgressFields(refundEgress, ignoredEgresses, 'REFUND') : undefined,
        broadcast: refundEgress?.broadcast
          ? getBroadcastFields(refundEgress.broadcast, refundEgressTrackerTxRef)
          : undefined,
      },
      ccm: {
        ...ccmParams,
        receivedBlockIndex: swapRequest?.ccmDepositReceivedBlockIndex ?? undefined,
      },
      boost: {
        effectiveBoostFeeBps,
        maxBoostFeeBps: swapDepositChannel?.maxBoostFeeBps,
        boostedAt: swapRequest?.depositBoostedAt?.valueOf(),
        boostedBlockIndex: swapRequest?.depositBoostedBlockIndex ?? undefined,
        skippedAt: swapDepositChannel?.failedBoosts.at(0)?.failedAtTimestamp.valueOf(),
        skippedBlockIndex: swapDepositChannel?.failedBoosts.at(0)?.failedAtBlockIndex ?? undefined,
      },
      error,
      failure: {
        mode: failureMode,
        reason: error,
        failedAt: failedSwap?.failedAt,
        failedBlockIndex: failedSwap?.failedBlockIndex ?? undefined,
      },
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

export default router;
