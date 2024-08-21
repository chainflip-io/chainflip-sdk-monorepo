import express from 'express';
import { Chain, assetConstants, getAssetAndChain } from '@/shared/enums';
import { assertUnreachable, getPriceFromPriceX128 } from '@/shared/functions';
import { openSwapDepositChannelSchema } from '@/shared/schemas';
import { screamingSnakeToPascalCase, toUpperCase } from '@/shared/strings';
import { getRequiredBlockConfirmations } from '@/swap/utils/rpc';
import { asyncHandler, maintenanceMode } from './common';
import prisma, { FailedSwapReason } from '../client';
import openSwapDepositChannel from '../handlers/openSwapDepositChannel';
import { getPendingBroadcast, getPendingDeposit } from '../ingress-egress-tracking';
import { readField } from '../utils/function';
import logger from '../utils/logger';
import ServiceError from '../utils/ServiceError';
import { estimateSwapDuration, isEgressableSwap } from '../utils/swap';

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

export enum Failure {
  IngressIgnored = 'INGRESS_IGNORED',
  EgressIgnored = 'EGRESS_IGNORED',
  RefundEgressIgnored = 'REFUND_EGRESS_IGNORED',
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
  swaps: { include: { fees: true } },
  egress: { include: { broadcast: true } },
  refundEgress: { include: { broadcast: true } },
  fees: true,
  ignoredEgress: true,
  swapDepositChannel: {
    include: depositChannelInclude,
  },
} as const;

const failedSwapMessage: Record<FailedSwapReason, string> = {
  BelowMinimumDeposit: 'The deposited amount was below the minimum required',
  NotEnoughToPayFees: 'The deposited amount was not enough to pay the fees',
};

const coerceChain = (chain: string) => {
  const uppercaseChain = toUpperCase(chain) as Uppercase<Chain>;
  switch (uppercaseChain) {
    case 'BITCOIN':
    case 'ETHEREUM':
    case 'POLKADOT':
    case 'ARBITRUM':
    case 'SOLANA':
      return screamingSnakeToPascalCase(uppercaseChain);
    default:
      assertUnreachable(uppercaseChain);
      throw ServiceError.badRequest(`invalid chain "${chain}"`);
  }
};

const channelIdRegex = /^(?<issuedBlock>\d+)-(?<srcChain>[a-z]+)-(?<channelId>\d+)$/i;
const swapRequestId = /^\d+$/i;
const txHashRegex = /^0x[a-f\d]+$/i;

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

    let state: State;
    let failureMode;
    let egressTrackerTxRef;
    let error: { name: string; message: string } | undefined;

    const egress = swapRequest?.egress ?? swapRequest?.refundEgress;
    const egressType = egress && (egress === swapRequest?.egress ? 'SWAP' : 'REFUND');

    const swap = swapRequest?.swaps.find(isEgressableSwap);

    if (failedSwap || swapRequest?.ignoredEgress) {
      error = {
        name: 'Unknown',
        message: 'An unknown error occurred',
      };
      state = State.Failed;

      if (failedSwap) {
        failureMode = Failure.IngressIgnored;
        error = {
          name: failedSwap.reason,
          message: failedSwapMessage[failedSwap.reason],
        };
      } else if (swapRequest?.ignoredEgress) {
        switch (swapRequest.ignoredEgress.type) {
          case 'REFUND':
            failureMode = Failure.RefundEgressIgnored;
            break;
          case 'SWAP':
            failureMode = Failure.EgressIgnored;
            break;
          default:
            assertUnreachable(swapRequest.ignoredEgress.type);
        }
        const [stateChainError] = await Promise.all([
          prisma.stateChainError.findUniqueOrThrow({
            where: { id: swapRequest.ignoredEgress.stateChainErrorId },
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
    } else if (swapRequest?.depositReceivedAt) {
      state = State.DepositReceived;
    } else {
      state = State.AwaitingDeposit;
    }

    const internalSrcAsset = readField(swapRequest, swapDepositChannel, failedSwap, 'srcAsset');
    const internalDestAsset = readField(swapRequest, swapDepositChannel, 'destAsset');

    let pendingDeposit;
    if (internalSrcAsset && state === State.AwaitingDeposit && swapDepositChannel?.depositAddress) {
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

    const fees = (swapRequest?.fees ?? []).concat(swap?.fees ?? []);

    const response = {
      state,
      type: swap?.type,
      ...(internalSrcAsset && getAssetAndChain(internalSrcAsset, 'src')),
      ...(internalDestAsset && getAssetAndChain(internalDestAsset, 'dest')),
      destAddress: readField(swapRequest, swapDepositChannel, failedSwap, 'destAddress'),
      depositChannelCreatedAt: swapDepositChannel?.createdAt.valueOf(),
      depositChannelBrokerCommissionBps: swapDepositChannel?.brokerCommissionBps,
      depositAddress: swapDepositChannel?.depositAddress,
      expectedDepositAmount: swapDepositChannel?.expectedDepositAmount?.toFixed(),
      srcChainRequiredBlockConfirmations:
        (internalSrcAsset && (await getRequiredBlockConfirmations(internalSrcAsset))) ?? undefined,
      swapId: swapRequest?.nativeId.toString(),
      depositAmount:
        readField(swapRequest, failedSwap, 'depositAmount')?.toFixed() ?? pendingDeposit?.amount,
      depositTransactionHash: depositTransactionRef, // DEPRECATED(1.5): use depositTransactionRef instead
      depositTransactionRef,
      depositTransactionConfirmations: pendingDeposit?.transactionConfirmations,
      depositReceivedAt: swapRequest?.depositReceivedAt?.valueOf(),
      depositReceivedBlockIndex: swapRequest?.depositReceivedBlockIndex ?? undefined,
      intermediateAmount: swap?.intermediateAmount?.toFixed(),
      swapExecutedAt: swap?.swapExecutedAt?.valueOf(),
      swapExecutedBlockIndex: swap?.swapExecutedBlockIndex ?? undefined,
      egressType: egressType ?? undefined,
      egressAmount: egress?.amount?.toFixed(),
      egressScheduledAt: egress?.scheduledAt?.valueOf(),
      egressScheduledBlockIndex: egress?.scheduledBlockIndex ?? undefined,
      ignoredEgressAmount: swapRequest?.ignoredEgress?.amount?.toFixed(),
      egressIgnoredAt: swapRequest?.ignoredEgress?.ignoredAt?.valueOf(),
      egressIgnoredBlockIndex: swapRequest?.ignoredEgress?.ignoredBlockIndex ?? undefined,
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
      ccmDepositReceivedBlockIndex: swapRequest?.ccmDepositReceivedBlockIndex ?? undefined,
      ccmMetadata: ccmParams, // DEPRECATED(1.5): use ccmParams instead
      ccmParams,
      depositChannelOpenedThroughBackend: swapDepositChannel?.openedThroughBackend,
      broadcastTransactionRef: egress?.broadcast?.transactionRef ?? egressTrackerTxRef,
      error,
      failure: failureMode,
      failedAt: failedSwap?.failedAt,
      failedBlockIndex: failedSwap?.failedBlockIndex ?? undefined,
      depositChannelAffiliateBrokers: affiliateBrokers,
      depositChannelMaxBoostFeeBps: swapDepositChannel?.maxBoostFeeBps,
      effectiveBoostFeeBps,
      depositBoostedAt: swapRequest?.depositBoostedAt?.valueOf(),
      depositBoostedBlockIndex: swapRequest?.depositBoostedBlockIndex ?? undefined,
      boostSkippedAt: swapDepositChannel?.failedBoosts.at(0)?.failedAtTimestamp.valueOf(),
      boostSkippedBlockIndex:
        swapDepositChannel?.failedBoosts.at(0)?.failedAtBlockIndex ?? undefined,
      estimatedDefaultDurationSeconds:
        srcAsset && destAsset && (await estimateSwapDuration({ srcAsset, destAsset })),
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
