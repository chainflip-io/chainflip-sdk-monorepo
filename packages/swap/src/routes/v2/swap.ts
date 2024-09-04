import express from 'express';
import { assetConstants, getAssetAndChain } from '@/shared/enums';
import { assertUnreachable, getPriceFromPriceX128 } from '@/shared/functions';
import { getRequiredBlockConfirmations } from '@/swap/utils/rpc';
import prisma, {
  Prisma,
  Swap,
  Egress,
  Broadcast,
  SwapFee,
  IgnoredEgress,
  FailedSwap,
} from '../../client';
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
  Sent = 'SENT',
  Sending = 'SENDING',
  Swapping = 'SWAPPING',
  Receiving = 'RECEIVING',
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

const getEgressStatusFields = (
  egress: Egress | null | undefined,
  broadcast: Broadcast | null | undefined,
  ignoredEgresses: IgnoredEgress[] | undefined,
  type: IgnoredEgress['type'] | undefined,
  egressTrackerTxRef: string | null | undefined,
  failedSwap: FailedSwap | null | undefined,
) => {
  const ignoredEgress = ignoredEgresses?.find((e) => e.type === type);
  const failedAt =
    failedSwap?.failedAt ?? broadcast?.abortedAt?.valueOf() ?? ignoredEgress?.ignoredAt?.valueOf();
  const failedAtBlockIndex =
    failedSwap?.failedBlockIndex ??
    broadcast?.abortedBlockIndex ??
    ignoredEgress?.ignoredBlockIndex;

  return {
    ...(egress && {
      outputAmount: egress.amount?.toFixed(),
      scheduledAt: egress.scheduledAt?.valueOf(),
      scheduledBlockIndex: egress.scheduledBlockIndex ?? undefined,
    }),
    ...(broadcast && {
      sentAt: broadcast?.succeededAt?.valueOf(),
      sentAtBlockIndex: broadcast?.succeededBlockIndex ?? undefined,
      sentTxRef: broadcast?.transactionRef ?? egressTrackerTxRef,
    }),
    ...(failedAt && failedAtBlockIndex && { failedAt, failedAtBlockIndex }),
    ...(ignoredEgress && { ignoredAmount: ignoredEgress.amount?.toFixed() }),
  };
};

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
        const message = swapEgress?.broadcast?.abortedAt
          ? 'The swap broadcast was aborted'
          : 'The refund broadcast was aborted';
        failureMode = Failure.BroadcastAborted;
        error = {
          name: 'BroadcastAborted',
          message,
        };
      }
    } else if (egress?.broadcast?.succeededAt) {
      state = StateV2.Complete;
    } else if (egress?.broadcast) {
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
    } else if (egress) {
      state = StateV2.Sending;
    } else if (swapRequest?.swaps.some((s) => s.swapScheduledAt)) {
      state = StateV2.Swapping;
    } else {
      state = StateV2.Receiving;
    }

    const internalSrcAsset = readField(swapRequest, swapDepositChannel, failedSwap, 'srcAsset');
    const internalDestAsset = readField(swapRequest, swapDepositChannel, 'destAsset');

    let pendingDeposit;
    if (internalSrcAsset && state === StateV2.Receiving && swapDepositChannel?.depositAddress) {
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
          acc.fees = acc.fees.concat(...curr.fees);
        }
        return acc;
      },
      {
        totalAmountSwapped: new Prisma.Decimal(0),
        totalChunksExecuted: 0,
        currentChunk: sortedSwaps[0],
        lastExecutedChunk: null as null | (typeof sortedSwaps)[number] | undefined,
        isDcaSwap:
          swapDepositChannel?.chunkIntervalBlocks && swapDepositChannel.chunkIntervalBlocks > 1,
        fees: [] as SwapFee[],
      },
    );

    const aggregateFees = rolledSwaps?.fees
      .reduce((acc, curr) => {
        const { type, asset, amount } = curr;

        const index = acc.findIndex((fee) => fee.type === type && fee.asset === asset);
        if (index !== -1) {
          acc[index].amount = acc[index].amount.plus(amount);
        } else acc.push(curr);

        return acc;
      }, [] as SwapFee[])
      .concat(swapRequest?.fees ?? [])
      .map((fee) => ({
        type: fee.type,
        ...getAssetAndChain(fee.asset),
        amount: fee.amount.toFixed(),
      }));

    const response = {
      state,
      swapId: swapRequest?.nativeId.toString(),
      ...(internalSrcAsset && getAssetAndChain(internalSrcAsset, 'src')),
      ...(internalDestAsset && getAssetAndChain(internalDestAsset, 'dest')),
      destAddress: readField(swapRequest, swapDepositChannel, failedSwap, 'destAddress'),
      depositChannel: {
        createdAt: swapDepositChannel?.createdAt.valueOf(),
        brokerCommissionBps: swapDepositChannel?.brokerCommissionBps,
        depositAddress: swapDepositChannel?.depositAddress,
        expiryBlock: swapDepositChannel?.srcChainExpiryBlock?.toString(),
        estimatedExpiryTime: swapDepositChannel?.estimatedExpiryAt?.valueOf(),
        expectedDepositAmount: swapDepositChannel?.expectedDepositAmount?.toFixed(),
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
        totalAmountSwapped: rolledSwaps?.totalAmountSwapped.toFixed(),
        lastExecutedChunk:
          rolledSwaps?.lastExecutedChunk && getSwapFields(rolledSwaps.lastExecutedChunk),
        currentChunk: rolledSwaps && getSwapFields(rolledSwaps.currentChunk),
        ...getEgressStatusFields(
          swapEgress,
          swapEgress?.broadcast,
          ignoredEgresses,
          'SWAP',
          swapEgressTrackerTxRef,
          failedSwap,
        ),
        fees: aggregateFees,
        srcChainRequiredBlockConfirmations:
          (internalSrcAsset && (await getRequiredBlockConfirmations(internalSrcAsset))) ??
          undefined,
        estimatedDurationSeconds:
          srcAsset && destAsset && (await estimateSwapDuration({ srcAsset, destAsset })),
        failure: failureMode
          ? {
              mode: failureMode,
              reason: error,
            }
          : undefined,
      },
      refund: {
        ...getEgressStatusFields(
          refundEgress,
          refundEgress?.broadcast,
          ignoredEgresses,
          'SWAP',
          refundEgressTrackerTxRef,
          failedSwap,
        ),
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
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

export default router;
