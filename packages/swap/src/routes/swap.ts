import express from 'express';
import { getAssetAndChain } from '@/shared/enums';
import { assertUnreachable, getPriceFromPriceX128 } from '@/shared/functions';
import { getRequiredBlockConfirmations } from '@/swap/utils/rpc';
import { asyncHandler, maintenanceMode } from './common';
import prisma from '../client';
import {
  openSwapDepositChannel,
  openSwapDepositChannelSchema,
} from '../handlers/openSwapDepositChannel';
import { getPendingBroadcast, getPendingDeposit } from '../ingress-egress-tracking';
import { readField } from '../utils/function';
import logger from '../utils/logger';
import ServiceError from '../utils/ServiceError';
import {
  estimateSwapDuration,
  failedSwapMessage,
  FailureMode,
  isEgressableSwap,
} from '../utils/swap';
import { getLatestSwapForId } from './v2/utils';
import { getLastChainTrackingUpdateTimestamp } from '../utils/intercept';

const router = express.Router();

export enum State {
  Failed = 'FAILED',
  Complete = 'COMPLETE',
  BroadcastAborted = 'BROADCAST_ABORTED', // TODO: move to Failed state
  Broadcasted = 'BROADCASTED',
  BroadcastRequested = 'BROADCAST_REQUESTED',
  EgressScheduled = 'EGRESS_SCHEDULED',
  SwapExecuted = 'SWAP_EXECUTED',
  DepositReceived = 'DEPOSIT_RECEIVED',
  AwaitingDeposit = 'AWAITING_DEPOSIT',
}

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { swapRequest, failedSwap, swapDepositChannel, beneficiaries } =
      await getLatestSwapForId(id);

    let state: State;
    let failureMode;
    let egressTrackerTxRef;
    let error: { name: string; message: string } | undefined;

    const egress = swapRequest?.egress ?? swapRequest?.refundEgress;
    const egressType = egress && (egress === swapRequest?.egress ? 'SWAP' : 'REFUND');

    const swap = swapRequest?.swaps.find(isEgressableSwap);
    const hasIgnoredEgresses =
      swapRequest?.ignoredEgresses && swapRequest.ignoredEgresses.length > 0;

    if (failedSwap || hasIgnoredEgresses) {
      error = {
        name: 'Unknown',
        message: 'An unknown error occurred',
      };
      state = State.Failed;

      if (failedSwap) {
        failureMode = FailureMode.IngressIgnored;
        error = {
          name: failedSwap.reason,
          message: failedSwapMessage[failedSwap.reason],
        };
      } else if (hasIgnoredEgresses) {
        const ignored = swapRequest?.ignoredEgresses.at(0);
        switch (ignored!.type) {
          case 'REFUND':
            failureMode = FailureMode.RefundEgressIgnored;
            break;
          case 'SWAP':
            failureMode = FailureMode.SwapEgressIgnored;
            break;
          default:
            assertUnreachable(ignored!.type);
        }
        const [stateChainError] = await Promise.all([
          prisma.stateChainError.findUniqueOrThrow({
            where: { id: swapRequest?.ignoredEgresses.at(0)!.stateChainErrorId },
          }),
        ]);
        error = {
          name: stateChainError.name,
          message: stateChainError.docs,
        };
      }
    } else if (egress?.broadcast?.succeededAt) {
      state = State.Complete;
    } else if (egress?.broadcast?.abortedAt) {
      state = State.BroadcastAborted;
    } else if (egress?.broadcast) {
      const pendingBroadcast = await getPendingBroadcast(egress.broadcast);
      if (pendingBroadcast) {
        state = State.Broadcasted;
        egressTrackerTxRef = pendingBroadcast.tx_ref;
      } else {
        state = State.BroadcastRequested;
      }
    } else if (egress) {
      state = State.EgressScheduled;
    } else if (swap?.swapExecutedAt) {
      state = State.SwapExecuted;
    } else if (swapRequest?.depositFinalisedAt || swapRequest?.depositBoostedAt) {
      state = State.DepositReceived;
    } else {
      state = State.AwaitingDeposit;
    }

    const internalSrcAsset = readField(swapRequest, swapDepositChannel, failedSwap, 'srcAsset');
    const internalDestAsset = readField(swapRequest, swapDepositChannel, 'destAsset');

    let pendingDeposit;
    if (internalSrcAsset && state === State.AwaitingDeposit && swapDepositChannel?.depositAddress) {
      pendingDeposit = await getPendingDeposit(internalSrcAsset, swapDepositChannel.depositAddress);
    }

    let ccmParams;
    if (readField(swapRequest, swapDepositChannel, 'ccmGasBudget')) {
      ccmParams = {
        gasBudget: readField(swapRequest, swapDepositChannel, 'ccmGasBudget')?.toFixed(),
        message: readField(swapRequest, swapDepositChannel, 'ccmMessage'),
      };
    }

    let effectiveBoostFeeBps;
    if (swapRequest?.maxBoostFeeBps || swapDepositChannel?.maxBoostFeeBps) {
      if (swapRequest) {
        effectiveBoostFeeBps = swapRequest.effectiveBoostFeeBps ?? undefined;
      } else if (swapDepositChannel?.failedBoosts.length) {
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

    const affiliates = beneficiaries
      ?.filter(({ type }) => type === 'AFFILIATE')
      .map(({ account, commissionBps }) => ({ account, commissionBps }));

    const fees = (swapRequest?.fees ?? []).concat(swap?.fees ?? []);

    const estimatedDurations =
      srcAsset && destAsset && (await estimateSwapDuration({ srcAsset, destAsset }));

    const response = {
      state,
      type: swap?.type,
      ...(internalSrcAsset && getAssetAndChain(internalSrcAsset, 'src')),
      ...(internalDestAsset && getAssetAndChain(internalDestAsset, 'dest')),
      destAddress: readField(swapRequest, swapDepositChannel, failedSwap, 'destAddress'),
      depositChannelCreatedAt: swapDepositChannel?.createdAt.valueOf(),
      depositChannelBrokerCommissionBps:
        swapDepositChannel &&
        (beneficiaries?.find(({ type }) => type === 'SUBMITTER')?.commissionBps ?? 0),
      depositAddress: swapDepositChannel?.depositAddress,
      expectedDepositAmount: swapDepositChannel?.expectedDepositAmount?.toFixed(),
      srcChainRequiredBlockConfirmations:
        (internalSrcAsset && (await getRequiredBlockConfirmations(internalSrcAsset))) ?? undefined,
      swapId: swapRequest?.nativeId.toString(),
      depositAmount:
        readField(swapRequest, failedSwap, 'depositAmount')?.toFixed() ?? pendingDeposit?.amount,
      depositTransactionRef,
      depositTransactionConfirmations: pendingDeposit?.transactionConfirmations,
      depositReceivedAt: swapRequest?.depositFinalisedAt?.valueOf(),
      depositReceivedBlockIndex: swapRequest?.depositFinalisedBlockIndex ?? undefined,
      intermediateAmount: swap?.intermediateAmount?.toFixed(),
      swapExecutedAt: swap?.swapExecutedAt?.valueOf(),
      swapExecutedBlockIndex: swap?.swapExecutedBlockIndex ?? undefined,
      egressType: egressType ?? undefined,
      egressAmount: egress?.amount?.toFixed(),
      egressScheduledAt: egress?.scheduledAt?.valueOf(),
      egressScheduledBlockIndex: egress?.scheduledBlockIndex ?? undefined,
      ignoredEgressAmount: swapRequest?.ignoredEgresses?.at(0)?.amount?.toFixed(),
      egressIgnoredAt: swapRequest?.ignoredEgresses?.at(0)?.ignoredAt?.valueOf(),
      egressIgnoredBlockIndex: swapRequest?.ignoredEgresses?.at(0)?.ignoredBlockIndex ?? undefined,
      feesPaid: fees.map((fee) => ({
        type: fee.type,
        ...getAssetAndChain(fee.asset),
        amount: fee.amount.toFixed(),
      })),
      broadcastRequestedAt: egress?.broadcast?.requestedAt?.valueOf(),
      broadcastRequestedBlockIndex: egress?.broadcast?.requestedBlockIndex ?? undefined,
      broadcastAbortedAt: egress?.broadcast?.abortedAt?.valueOf(),
      broadcastAbortedBlockIndex: egress?.broadcast?.abortedBlockIndex ?? undefined,
      broadcastSucceededAt: egress?.broadcast?.succeededAt?.valueOf(),
      broadcastSucceededBlockIndex: egress?.broadcast?.succeededBlockIndex ?? undefined,
      depositChannelExpiryBlock: swapDepositChannel?.srcChainExpiryBlock?.toString(),
      estimatedDepositChannelExpiryTime: swapDepositChannel?.estimatedExpiryAt?.valueOf(),
      isDepositChannelExpired: swapDepositChannel?.isExpired,
      ccmParams,
      depositChannelOpenedThroughBackend: swapDepositChannel?.openedThroughBackend,
      broadcastTransactionRef: egress?.broadcast?.transactionRef ?? egressTrackerTxRef,
      error,
      failure: failureMode,
      failedAt: failedSwap?.failedAt,
      failedBlockIndex: failedSwap?.failedBlockIndex ?? undefined,
      depositChannelAffiliateBrokers:
        swapDepositChannel && affiliates?.length ? affiliates : undefined,
      depositChannelMaxBoostFeeBps: swapDepositChannel?.maxBoostFeeBps,
      effectiveBoostFeeBps,
      depositBoostedAt: swapRequest?.depositBoostedAt?.valueOf(),
      depositBoostedBlockIndex: swapRequest?.depositBoostedBlockIndex ?? undefined,
      boostSkippedAt: swapDepositChannel?.failedBoosts.at(0)?.failedAtTimestamp.valueOf(),
      boostSkippedBlockIndex:
        swapDepositChannel?.failedBoosts.at(0)?.failedAtBlockIndex ?? undefined,
      estimatedDefaultDurationSeconds: estimatedDurations?.total,
      swapScheduledAt: swap?.swapScheduledAt.valueOf(),
      swapScheduledBlockIndex: swap?.swapScheduledBlockIndex,
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
      lastStatechainUpdateAt: (await getLastChainTrackingUpdateTimestamp())?.valueOf(),
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

// TODO(major): remove this handler. it's replaced by tRPC
router.post(
  '/',
  maintenanceMode,
  asyncHandler(async (req, res) => {
    const result = openSwapDepositChannelSchema.safeParse(req.body);
    if (!result.success) {
      logger.info('received bad request for new swap', { body: req.body });
      throw ServiceError.badRequest('invalid request body');
    }

    const { srcChainExpiryBlock, channelOpeningFee, ...response } = await openSwapDepositChannel(
      result.data,
    );

    res.json(response);
  }),
);

export default router;
