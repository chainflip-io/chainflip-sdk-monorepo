import assert from 'assert';
import express from 'express';
import { assetChains, Chain } from '@/shared/enums';
import { openSwapDepositChannelSchema } from '@/shared/schemas';
import { asyncHandler } from './common';
import prisma, {
  Egress,
  Swap,
  SwapDepositChannel,
  Broadcast,
  SwapFee,
} from '../client';
import { getPendingDeposit } from '../deposit-tracking';
import openSwapDepositChannel from '../handlers/openSwapDepositChannel';
import logger from '../utils/logger';
import ServiceError from '../utils/ServiceError';

const router = express.Router();

export enum State {
  Complete = 'COMPLETE',
  BroadcastAborted = 'BROADCAST_ABORTED',
  BroadcastRequested = 'BROADCAST_REQUESTED',
  EgressScheduled = 'EGRESS_SCHEDULED',
  SwapExecuted = 'SWAP_EXECUTED',
  DepositReceived = 'DEPOSIT_RECEIVED',
  AwaitingDeposit = 'AWAITING_DEPOSIT',
}

type SwapWithBroadcastAndFees = Swap & {
  fees: SwapFee[];
  egress:
    | (Egress & {
        broadcast: Broadcast | null;
      })
    | null;
};

const channelIdRegex =
  /^(?<issuedBlock>\d+)-(?<srcChain>[a-z]+)-(?<channelId>\d+)$/i;
const swapIdRegex = /^\d+$/i;
const txHashRegex = /^0x[a-f\d]+$/i;

// eslint-disable-next-line @typescript-eslint/ban-types
const readField = <A extends {}, B extends {}, K extends keyof A & keyof B>(
  a: A | null | undefined,
  b: B | null | undefined,
  key: K,
) => a?.[key] ?? b?.[key];

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    let swap: SwapWithBroadcastAndFees | null | undefined;
    let swapDepositChannel:
      | (SwapDepositChannel & { swaps: SwapWithBroadcastAndFees[] })
      | null
      | undefined;

    if (channelIdRegex.test(id)) {
      const { issuedBlock, srcChain, channelId } =
        channelIdRegex.exec(id)!.groups!;

      swapDepositChannel = await prisma.swapDepositChannel.findUnique({
        where: {
          issuedBlock_srcChain_channelId: {
            issuedBlock: Number(issuedBlock),
            srcChain: srcChain as Chain,
            channelId: BigInt(channelId),
          },
        },
        include: {
          swaps: {
            include: { egress: { include: { broadcast: true } }, fees: true },
          },
        },
      });

      if (!swapDepositChannel) {
        logger.info(`could not find swap request with id "${id}`);
        throw ServiceError.notFound();
      }

      swap = swapDepositChannel.swaps.at(0);
    } else if (swapIdRegex.test(id)) {
      swap = await prisma.swap.findUnique({
        where: { nativeId: BigInt(id) },
        include: { egress: { include: { broadcast: true } }, fees: true },
      });
    } else if (txHashRegex.test(id)) {
      swap = await prisma.swap.findFirst({
        where: { txHash: id },
        include: { egress: { include: { broadcast: true } }, fees: true },
        // just get the last one for now
        orderBy: { createdAt: 'desc' },
      });
    }

    ServiceError.assert(
      swapDepositChannel || swap,
      'notFound',
      'resource not found',
    );

    let state: State;

    if (swap?.egress?.broadcast?.succeededAt) {
      assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
      state = State.Complete;
    } else if (swap?.egress?.broadcast?.abortedAt) {
      assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
      state = State.BroadcastAborted;
    } else if (swap?.egress?.broadcast) {
      assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
      state = State.BroadcastRequested;
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

    const srcAsset = readField(swap, swapDepositChannel, 'srcAsset');
    const destAsset = readField(swap, swapDepositChannel, 'destAsset');

    let pendingDeposit;
    if (
      srcAsset &&
      state === State.AwaitingDeposit &&
      swapDepositChannel?.depositAddress
    ) {
      pendingDeposit = await getPendingDeposit(
        assetChains[srcAsset],
        swapDepositChannel.depositAddress,
      );
    }

    const response = {
      state,
      type: swap?.type,
      srcChain: srcAsset && assetChains[srcAsset],
      destChain: destAsset && assetChains[destAsset],
      srcAsset,
      destAsset,
      destAddress: readField(swap, swapDepositChannel, 'destAddress'),
      depositChannelCreatedAt: swapDepositChannel?.createdAt.valueOf(),
      depositAddress: swapDepositChannel?.depositAddress,
      expectedDepositAmount:
        swapDepositChannel?.expectedDepositAmount.toString(),
      swapId: swap?.nativeId.toString(),
      depositAmount: swap?.depositAmount?.toString() ?? pendingDeposit?.amount,
      depositTransactionHash: pendingDeposit?.transactionHash,
      depositTransactionConfirmations: pendingDeposit?.transactionConfirmations,
      depositReceivedAt: swap?.depositReceivedAt.valueOf(),
      depositReceivedBlockIndex: swap?.depositReceivedBlockIndex,
      intermediateAmount: swap?.intermediateAmount?.toString(),
      swapExecutedAt: swap?.swapExecutedAt?.valueOf(),
      swapExecutedBlockIndex: swap?.swapExecutedBlockIndex,
      egressAmount: swap?.egress?.amount?.toString(),
      egressScheduledAt: swap?.egress?.scheduledAt?.valueOf(),
      egressScheduledBlockIndex: swap?.egress?.scheduledBlockIndex,
      paidFess: swap?.fees.map((fee) => ({
        type: fee.type,
        asset: fee.asset,
        amount: fee.amount.toString(),
      })),
      broadcastRequestedAt: swap?.egress?.broadcast?.requestedAt?.valueOf(),
      broadcastRequestedBlockIndex:
        swap?.egress?.broadcast?.requestedBlockIndex,
      broadcastAbortedAt: swap?.egress?.broadcast?.abortedAt?.valueOf(),
      broadcastAbortedBlockIndex: swap?.egress?.broadcast?.abortedBlockIndex,
      broadcastSucceededAt: swap?.egress?.broadcast?.succeededAt?.valueOf(),
      broadcastSucceededBlockIndex:
        swap?.egress?.broadcast?.succeededBlockIndex,
      depositChannelExpiryBlock:
        swapDepositChannel?.srcChainExpiryBlock?.toString(),
      estimatedDepositChannelExpiryTime:
        swapDepositChannel?.estimatedExpiryAt?.valueOf(),
      isDepositChanneExpired: swapDepositChannel?.isExpired ?? false,
      ccmDepositReceivedBlockIndex: swap?.ccmDepositReceivedBlockIndex,
      ccmMetadata: swap?.ccmGasBudget && {
        gasBudget: swap?.ccmGasBudget?.toString(),
        message: swap?.ccmMessage,
      },
      depositChannelOpenedThroughBackend:
        swapDepositChannel?.openedThroughBackend ?? false,
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

// TODO(major): remove this handler. it's replaced by tRPC
router.post(
  '/',
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
