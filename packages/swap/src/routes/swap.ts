import assert from 'assert';
import express from 'express';
import { assetConstants } from '@/shared/enums';
import { openSwapDepositChannelSchema } from '@/shared/schemas';
import { screamingSnakeToPascalCase } from '@/shared/strings';
import { asyncHandler, maintenanceMiddleware } from './common';
import prisma, {
  Egress,
  Swap,
  SwapDepositChannel,
  Broadcast,
  SwapFee,
  FailedSwap,
  IgnoredEgress,
  FailedSwapReason,
} from '../client';
import openSwapDepositChannel from '../handlers/openSwapDepositChannel';
import {
  getPendingBroadcast,
  getPendingDeposit,
} from '../ingress-egress-tracking';
import { readField } from '../utils/function';
import logger from '../utils/logger';
import { getWitnessSafetyMargin } from '../utils/rpc';
import ServiceError from '../utils/ServiceError';

const router = express.Router();

export enum State {
  Failed = 'FAILED',
  Complete = 'COMPLETE',
  BroadcastAborted = 'BROADCAST_ABORTED',
  Broadcasted = 'BROADCASTED',
  BroadcastRequested = 'BROADCAST_REQUESTED',
  EgressScheduled = 'EGRESS_SCHEDULED',
  SwapExecuted = 'SWAP_EXECUTED',
  DepositReceived = 'DEPOSIT_RECEIVED',
  AwaitingDeposit = 'AWAITING_DEPOSIT',
}

type SwapWithAdditionalInfo = Swap & {
  fees: SwapFee[];
  egress:
    | (Egress & {
        broadcast: Broadcast | null;
      })
    | null;
  ignoredEgress: IgnoredEgress | null;
};

const swapInclude = {
  egress: { include: { broadcast: true } },
  fees: true,
  ignoredEgress: true,
} as const;

const failedSwapMessage: Record<FailedSwapReason, string> = {
  BelowMinimumDeposit: 'The deposited amount was below the minimum required',
  NotEnoughToPayFees: 'The deposited amount was not enough to pay the fees',
};

const coerceChain = (chain: string) => {
  const uppercase = chain.toUpperCase();
  switch (uppercase) {
    case 'BITCOIN':
    case 'ETHEREUM':
    case 'POLKADOT':
      return screamingSnakeToPascalCase(uppercase);
    default:
      throw ServiceError.badRequest(`invalid chain "${chain}"`);
  }
};

const channelIdRegex =
  /^(?<issuedBlock>\d+)-(?<srcChain>[a-z]+)-(?<channelId>\d+)$/i;
const swapIdRegex = /^\d+$/i;
const txHashRegex = /^0x[a-f\d]+$/i;

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    let swap: SwapWithAdditionalInfo | null | undefined;
    let failedSwap: FailedSwap | null | undefined;
    let swapDepositChannel:
      | (SwapDepositChannel & {
          swaps: SwapWithAdditionalInfo[];
          failedSwaps: FailedSwap[];
        })
      | null
      | undefined;

    if (channelIdRegex.test(id)) {
      const { issuedBlock, srcChain, channelId } =
        channelIdRegex.exec(id)!.groups!;

      swapDepositChannel = await prisma.swapDepositChannel.findUnique({
        where: {
          issuedBlock_srcChain_channelId: {
            issuedBlock: Number(issuedBlock),
            srcChain: coerceChain(srcChain),
            channelId: BigInt(channelId),
          },
        },
        include: { swaps: { include: swapInclude }, failedSwaps: true },
      });

      if (!swapDepositChannel) {
        logger.info(`could not find swap request with id "${id}`);
        throw ServiceError.notFound();
      }

      swap = swapDepositChannel.swaps.at(0);
      failedSwap = swapDepositChannel.failedSwaps.at(0);
    } else if (swapIdRegex.test(id)) {
      swap = await prisma.swap.findUnique({
        where: { nativeId: BigInt(id) },
        include: swapInclude,
      });
    } else if (txHashRegex.test(id)) {
      swap = await prisma.swap.findFirst({
        where: { txHash: id },
        include: swapInclude,
        // just get the last one for now
        orderBy: { nativeId: 'desc' },
      });
      if (!swap) {
        failedSwap = await prisma.failedSwap.findFirst({
          where: { txHash: id },
        });
      }
    }

    ServiceError.assert(
      swapDepositChannel || swap || failedSwap,
      'notFound',
      'resource not found',
    );

    let state: State;
    let failureMode;
    let error: { name: string; message: string } | undefined;

    if (failedSwap || swap?.ignoredEgress) {
      error = {
        name: 'Unknown',
        message: 'An unknown error occurred',
      };
      state = State.Failed;

      if (failedSwap) {
        failureMode = 'INGRESS_IGNORED';
        error = {
          name: failedSwap.reason,
          message: failedSwapMessage[failedSwap.reason],
        };
      } else if (swap?.ignoredEgress) {
        failureMode = 'EGRESS_IGNORED';
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
    } else if (swap?.egress?.broadcast?.succeededAt) {
      assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
      state = State.Complete;
    } else if (swap?.egress?.broadcast?.abortedAt) {
      assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
      state = State.BroadcastAborted;
    } else if (swap?.egress?.broadcast) {
      assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
      if (await getPendingBroadcast(swap.egress.broadcast)) {
        state = State.Broadcasted;
      } else {
        state = State.BroadcastRequested;
      }
    } else if (swap?.egress) {
      assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
      state = State.EgressScheduled;
    } else if (swap?.swapExecutedAt) {
      state = State.SwapExecuted;
    } else if (swap?.depositReceivedAt) {
      state = State.DepositReceived;
    } else {
      state = State.AwaitingDeposit;
    }

    const internalSrcAsset = readField(
      swap,
      swapDepositChannel,
      failedSwap,
      'srcAsset',
    );
    const internalDestAsset = readField(swap, swapDepositChannel, 'destAsset');

    let pendingDeposit;
    if (
      internalSrcAsset &&
      state === State.AwaitingDeposit &&
      swapDepositChannel?.depositAddress
    ) {
      pendingDeposit = await getPendingDeposit(
        assetConstants[internalSrcAsset].chain,
        assetConstants[internalSrcAsset].asset,
        swapDepositChannel.depositAddress,
      );
    }

    let ccmMetadata;
    if (readField(swap, swapDepositChannel, 'ccmGasBudget')) {
      ccmMetadata = {
        gasBudget: readField(
          swap,
          swapDepositChannel,
          'ccmGasBudget',
        )?.toFixed(),
        message: readField(swap, swapDepositChannel, 'ccmMessage'),
      };
    }

    const srcChain = internalSrcAsset && assetConstants[internalSrcAsset].chain;

    const response = {
      state,
      type: swap?.type,
      srcChain,
      srcAsset: internalSrcAsset && assetConstants[internalSrcAsset].asset,
      destChain: internalDestAsset && assetConstants[internalDestAsset].chain,
      destAsset: internalDestAsset && assetConstants[internalDestAsset].asset,
      destAddress: readField(
        swap,
        swapDepositChannel,
        failedSwap,
        'destAddress',
      ),
      depositChannelCreatedAt: swapDepositChannel?.createdAt.valueOf(),
      depositChannelBrokerCommissionBps:
        swapDepositChannel?.brokerCommissionBps,
      depositAddress: swapDepositChannel?.depositAddress,
      expectedDepositAmount:
        swapDepositChannel?.expectedDepositAmount?.toFixed(),
      swapId: swap?.nativeId.toString(),
      depositAmount:
        readField(swap, failedSwap, 'depositAmount')?.toFixed() ??
        pendingDeposit?.amount,
      depositTransactionHash:
        pendingDeposit?.transactionHash ?? failedSwap?.txHash ?? undefined,
      depositTransactionConfirmations: pendingDeposit?.transactionConfirmations,
      depositReceivedAt: swap?.depositReceivedAt.valueOf(),
      depositReceivedBlockIndex: swap?.depositReceivedBlockIndex ?? undefined,
      intermediateAmount: swap?.intermediateAmount?.toFixed(),
      swapExecutedAt: swap?.swapExecutedAt?.valueOf(),
      witnessSafetyMargin: srcChain
        ? Number((await getWitnessSafetyMargin(srcChain))?.toString())
        : undefined,
      swapExecutedBlockIndex: swap?.swapExecutedBlockIndex ?? undefined,
      egressAmount: swap?.egress?.amount?.toFixed(),
      egressScheduledAt: swap?.egress?.scheduledAt?.valueOf(),
      egressScheduledBlockIndex: swap?.egress?.scheduledBlockIndex ?? undefined,
      ignoredEgressAmount: swap?.ignoredEgress?.amount?.toFixed(),
      egressIgnoredAt: swap?.ignoredEgress?.ignoredAt?.valueOf(),
      egressIgnoredBlockIndex:
        swap?.ignoredEgress?.ignoredBlockIndex ?? undefined,
      feesPaid:
        swap?.fees.map((fee) => ({
          type: fee.type,
          chain: assetConstants[fee.asset].chain,
          asset: assetConstants[fee.asset].asset,
          amount: fee.amount.toFixed(),
        })) ?? [],
      broadcastRequestedAt: swap?.egress?.broadcast?.requestedAt?.valueOf(),
      broadcastRequestedBlockIndex:
        swap?.egress?.broadcast?.requestedBlockIndex ?? undefined,
      broadcastAbortedAt: swap?.egress?.broadcast?.abortedAt?.valueOf(),
      broadcastAbortedBlockIndex:
        swap?.egress?.broadcast?.abortedBlockIndex ?? undefined,
      broadcastSucceededAt: swap?.egress?.broadcast?.succeededAt?.valueOf(),
      broadcastSucceededBlockIndex:
        swap?.egress?.broadcast?.succeededBlockIndex ?? undefined,
      depositChannelExpiryBlock:
        swapDepositChannel?.srcChainExpiryBlock?.toString(),
      estimatedDepositChannelExpiryTime:
        swapDepositChannel?.estimatedExpiryAt?.valueOf(),
      isDepositChannelExpired: swapDepositChannel?.isExpired,
      ccmDepositReceivedBlockIndex:
        swap?.ccmDepositReceivedBlockIndex ?? undefined,
      ccmMetadata,
      depositChannelOpenedThroughBackend:
        swapDepositChannel?.openedThroughBackend,
      error,
      failure: failureMode,
      failedAt: failedSwap?.failedAt,
      failedBlockIndex: failedSwap?.failedBlockIndex ?? undefined,
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

// TODO(major): remove this handler. it's replaced by tRPC
router.post(
  '/',
  maintenanceMiddleware,
  asyncHandler(async (req, res) => {
    const result = openSwapDepositChannelSchema.safeParse(req.body);
    if (!result.success) {
      logger.info('received bad request for new swap', { body: req.body });
      throw ServiceError.badRequest('invalid request body');
    }

    const { srcChainExpiryBlock, ...response } = await openSwapDepositChannel(
      result.data,
    );

    res.json(response);
  }),
);

export default router;
