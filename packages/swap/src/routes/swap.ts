import express from 'express';
import { Chain, assetConstants } from '@/shared/enums';
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
import { estimateSwapDuration } from '../utils/swap';

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

const swapInclude = {
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
const swapIdRegex = /^\d+$/i;
const txHashRegex = /^0x[a-f\d]+$/i;

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    let swap;
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
          swaps: { include: swapInclude },
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
        logger.info(`could not find swap request with id "${id}`);
        throw ServiceError.notFound();
      }

      swap = swapDepositChannel.swaps.at(0);
      failedSwap = swapDepositChannel.failedSwaps.at(0);
      if (swapDepositChannel.affiliates.length > 0) {
        affiliateBrokers = swapDepositChannel.affiliates;
      }
    } else if (swapIdRegex.test(id)) {
      swap = await prisma.swap.findUnique({
        where: { nativeId: BigInt(id) },
        include: swapInclude,
      });
    } else if (txHashRegex.test(id)) {
      swap = await prisma.swap.findFirst({
        where: { depositTransactionRef: id },
        include: swapInclude,
        // just get the last one for now
        orderBy: { nativeId: 'desc' },
        take: 1,
      });
      if (!swap) {
        failedSwap = await prisma.failedSwap.findFirst({
          where: { depositTransactionRef: id },
          include: { swapDepositChannel: { include: depositChannelInclude } },
        });
      }
    }

    swapDepositChannel ??= swap?.swapDepositChannel ?? failedSwap?.swapDepositChannel;

    ServiceError.assert(swapDepositChannel || swap || failedSwap, 'notFound', 'resource not found');

    let state: State;
    let failureMode;
    let egressTrackerTxRef;
    let error: { name: string; message: string } | undefined;

    const egress = swap?.egress ?? swap?.refundEgress;
    const egressType = egress && (egress === swap?.egress ? 'SWAP' : 'REFUND');

    if (failedSwap || swap?.ignoredEgress) {
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
      } else if (swap?.ignoredEgress) {
        switch (swap.ignoredEgress.type) {
          case 'REFUND':
            failureMode = Failure.RefundEgressIgnored;
            break;
          case 'SWAP':
            failureMode = Failure.EgressIgnored;
            break;
          default:
            assertUnreachable(swap.ignoredEgress.type);
        }
        const [stateChainError] = await Promise.all([
          prisma.stateChainError.findUniqueOrThrow({
            where: { id: swap.ignoredEgress.stateChainErrorId },
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
    } else if (swap?.depositReceivedAt) {
      state = State.DepositReceived;
    } else {
      state = State.AwaitingDeposit;
    }

    const internalSrcAsset = readField(swap, swapDepositChannel, failedSwap, 'srcAsset');
    const internalDestAsset = readField(swap, swapDepositChannel, 'destAsset');

    let pendingDeposit;
    if (internalSrcAsset && state === State.AwaitingDeposit && swapDepositChannel?.depositAddress) {
      pendingDeposit = await getPendingDeposit(
        assetConstants[internalSrcAsset].chain,
        assetConstants[internalSrcAsset].asset,
        swapDepositChannel.depositAddress,
      );
    }

    let ccmParams;
    if (readField(swap, swapDepositChannel, 'ccmGasBudget')) {
      ccmParams = {
        gasBudget: readField(swap, swapDepositChannel, 'ccmGasBudget')?.toFixed(),
        message: readField(swap, swapDepositChannel, 'ccmMessage'),
      };
    }

    let effectiveBoostFeeBps;

    if (swapDepositChannel && swapDepositChannel.maxBoostFeeBps > 0) {
      if (swap) {
        effectiveBoostFeeBps = swap.effectiveBoostFeeBps ?? undefined;
      } else if (swapDepositChannel.failedBoosts.length > 0) {
        effectiveBoostFeeBps = 0;
      }
    }
    const { srcAsset, destAsset } = {
      srcAsset: swapDepositChannel?.srcAsset || swap?.srcAsset,
      destAsset: swapDepositChannel?.destAsset || swap?.destAsset,
    };

    const depositTransactionRef =
      swap?.depositTransactionRef ??
      pendingDeposit?.transactionHash ??
      failedSwap?.depositTransactionRef ??
      undefined;

    const response = {
      state,
      type: swap?.type,
      srcChain: internalSrcAsset && assetConstants[internalSrcAsset].chain,
      srcAsset: internalSrcAsset && assetConstants[internalSrcAsset].asset,
      destChain: internalDestAsset && assetConstants[internalDestAsset].chain,
      destAsset: internalDestAsset && assetConstants[internalDestAsset].asset,
      destAddress: readField(swap, swapDepositChannel, failedSwap, 'destAddress'),
      depositChannelCreatedAt: swapDepositChannel?.createdAt.valueOf(),
      depositChannelBrokerCommissionBps: swapDepositChannel?.brokerCommissionBps,
      depositAddress: swapDepositChannel?.depositAddress,
      expectedDepositAmount: swapDepositChannel?.expectedDepositAmount?.toFixed(),
      srcChainRequiredBlockConfirmations:
        (internalSrcAsset && (await getRequiredBlockConfirmations(internalSrcAsset))) ?? undefined,
      swapId: swap?.nativeId.toString(),
      depositAmount:
        readField(swap, failedSwap, 'depositAmount')?.toFixed() ?? pendingDeposit?.amount,
      depositTransactionHash: depositTransactionRef, // DEPRECATED(1.5): use depositTransactionRef instead
      depositTransactionRef,
      depositTransactionConfirmations: pendingDeposit?.transactionConfirmations,
      depositReceivedAt: swap?.depositReceivedAt.valueOf(),
      depositReceivedBlockIndex: swap?.depositReceivedBlockIndex ?? undefined,
      intermediateAmount: swap?.intermediateAmount?.toFixed(),
      swapExecutedAt: swap?.swapExecutedAt?.valueOf(),
      swapExecutedBlockIndex: swap?.swapExecutedBlockIndex ?? undefined,
      egressType: egressType ?? undefined,
      egressAmount: egress?.amount?.toFixed(),
      egressScheduledAt: egress?.scheduledAt?.valueOf(),
      egressScheduledBlockIndex: egress?.scheduledBlockIndex ?? undefined,
      ignoredEgressAmount: swap?.ignoredEgress?.amount?.toFixed(),
      egressIgnoredAt: swap?.ignoredEgress?.ignoredAt?.valueOf(),
      egressIgnoredBlockIndex: swap?.ignoredEgress?.ignoredBlockIndex ?? undefined,
      feesPaid:
        swap?.fees.map((fee) => ({
          type: fee.type,
          chain: assetConstants[fee.asset].chain,
          asset: assetConstants[fee.asset].asset,
          amount: fee.amount.toFixed(),
        })) ?? [],
      broadcastRequestedAt: egress?.broadcast?.requestedAt?.valueOf(),
      broadcastRequestedBlockIndex: egress?.broadcast?.requestedBlockIndex ?? undefined,
      broadcastAbortedAt: egress?.broadcast?.abortedAt?.valueOf(),
      broadcastAbortedBlockIndex: egress?.broadcast?.abortedBlockIndex ?? undefined,
      broadcastSucceededAt: egress?.broadcast?.succeededAt?.valueOf(),
      broadcastSucceededBlockIndex: egress?.broadcast?.succeededBlockIndex ?? undefined,
      depositChannelExpiryBlock: swapDepositChannel?.srcChainExpiryBlock?.toString(),
      estimatedDepositChannelExpiryTime: swapDepositChannel?.estimatedExpiryAt?.valueOf(),
      isDepositChannelExpired: swapDepositChannel?.isExpired,
      ccmDepositReceivedBlockIndex: swap?.ccmDepositReceivedBlockIndex ?? undefined,
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
      depositBoostedAt: swap?.depositBoostedAt?.valueOf(),
      depositBoostedBlockIndex: swap?.depositBoostedBlockIndex ?? undefined,
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
