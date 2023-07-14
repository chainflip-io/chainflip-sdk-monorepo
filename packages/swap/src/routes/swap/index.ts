import assert from 'assert';
import express from 'express';
import { assetChains } from '@/shared/enums';
import { postSwapSchema } from '@/shared/schemas';
import { validateAddress } from '@/shared/validation/addressValidation';
import prisma, { Egress, Swap, SwapDepositChannel } from '../../client';
import { submitSwapToBroker } from '../../utils/broker';
import { isProduction } from '../../utils/consts';
import logger from '../../utils/logger';
import ServiceError from '../../utils/ServiceError';
import { asyncHandler } from '../common';

const router = express.Router();

export enum State {
  Complete = 'COMPLETE',
  EgressScheduled = 'EGRESS_SCHEDULED',
  SwapExecuted = 'SWAP_EXECUTED',
  DepositReceived = 'DEPOSIT_RECEIVED',
  AwaitingDeposit = 'AWAITING_DEPOSIT',
}

type SwapWithEgress = Swap & {
  egress: Egress | null;
};

const uuidRegex = /^[a-f\d]{8}(-[a-f\d]{4}){4}[a-f\d]{8}$/i;
const txHashRegex = /^0x[a-f\d]+$/i;

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    let swap: SwapWithEgress | null | undefined;
    let swapDepositChannel:
      | (SwapDepositChannel & { swaps: SwapWithEgress[] })
      | null
      | undefined;

    // TODO:0.9 refactor the deposit channel to use the $BLOCK_NUMBER-$CHANNEL_ID format
    if (uuidRegex.test(id)) {
      swapDepositChannel = await prisma.swapDepositChannel.findUnique({
        where: { uuid: id },
        include: { swaps: { include: { egress: true } } },
      });

      if (!swapDepositChannel) {
        logger.info(`could not find swap request with id "${id}`);
        throw ServiceError.notFound();
      }

      swap = swapDepositChannel.swaps.at(0);
    } else if (txHashRegex.test(id)) {
      swap = await prisma.swap.findUnique({
        where: { txHash: id },
        include: { egress: true },
      });
    }

    ServiceError.assert(
      swapDepositChannel || swap,
      'notFound',
      'resource not found',
    );

    let state: State;

    if (swap?.egressCompletedAt) {
      assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
      assert(swap.egress, 'egress should not be null');
      state = State.Complete;
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

    const readField = <T extends keyof Swap & keyof SwapDepositChannel>(
      field: T,
    ) =>
      (swap && swap[field]) ??
      (swapDepositChannel && swapDepositChannel[field]);

    const srcAsset = readField('srcAsset');
    const destAsset = readField('destAsset');

    const response = {
      state,
      swapId: swap?.nativeId.toString(),
      srcChain: srcAsset && assetChains[srcAsset],
      destChain: destAsset && assetChains[destAsset],
      srcAsset,
      destAsset,
      destAddress: readField('destAddress'),
      depositAddress: swapDepositChannel?.depositAddress,
      expectedDepositAmount:
        swapDepositChannel?.expectedDepositAmount.toString(),
      depositAmount: swap?.depositAmount?.toString(),
      depositReceivedAt: swap?.depositReceivedAt.valueOf(),
      depositReceivedBlockIndex: swap?.depositReceivedBlockIndex,
      swapExecutedAt: swap?.swapExecutedAt?.valueOf(),
      swapExecutedBlockIndex: swap?.swapExecutedBlockIndex,
      egressAmount: swap?.egress?.amount?.toString(),
      egressCompletedAt: swap?.egressCompletedAt?.valueOf(),
      egressCompletedBlockIndex: swap?.egressCompletedBlockIndex,
      egressScheduledAt: swap?.egress?.timestamp.valueOf(),
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const result = postSwapSchema.safeParse(req.body);
    if (!result.success) {
      logger.info('received bad request for new swap', { body: req.body });
      throw ServiceError.badRequest('invalid request body');
    }

    const payload = result.data;

    if (
      !validateAddress(payload.destAsset, payload.destAddress, isProduction)
    ) {
      throw ServiceError.badRequest('provided address is not valid');
    }

    const { address: depositAddress, ...blockInfo } = await submitSwapToBroker(
      payload,
    );

    const { srcChain, destChain, ...rest } = payload;

    const { uuid } = await prisma.swapDepositChannel.create({
      data: {
        ...rest,
        depositAddress,
        ...blockInfo,
      },
    });

    res.json({ id: uuid, depositAddress, issuedBlock: blockInfo.issuedBlock });
  }),
);

export default router;
