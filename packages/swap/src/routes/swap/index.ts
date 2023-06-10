import assert from 'assert';
import express from 'express';
import { validateAddress } from '@/shared/validation/addressValidation';
import { postSwapSchema } from '@/shared/schemas';
import prisma from '../../client';
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

router.get(
  '/:uuid',
  asyncHandler(async (req, res) => {
    const { uuid } = req.params;

    const swapDepositChannel = await prisma.swapDepositChannel.findUnique({
      where: { uuid },
      include: { swaps: { include: { egress: true } } },
    });

    if (!swapDepositChannel) {
      logger.info(`could not find swap request with id "${uuid}`);
      throw ServiceError.notFound();
    }

    const swap = swapDepositChannel.swaps.at(0);

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

    const response = {
      state,
      depositAddress: swapDepositChannel.depositAddress,
      depositAmount: swap?.depositAmount?.toString(),
      srcAsset: swapDepositChannel.srcAsset,
      depositReceivedAt: swap?.depositReceivedAt.valueOf(),
      depositReceivedBlockIndex: swap?.depositReceivedBlockIndex,
      destAddress: swapDepositChannel.destAddress,
      destAsset: swapDepositChannel.destAsset,
      egressAmount: swap?.egress?.amount?.toString(),
      egressCompletedAt: swap?.egressCompletedAt?.valueOf(),
      egressCompletedBlockIndex: swap?.egressCompletedBlockIndex,
      egressScheduledAt: swap?.egress?.timestamp.valueOf(),
      expectedDepositAmount:
        swapDepositChannel.expectedDepositAmount.toString(),
      swapExecutedAt: swap?.swapExecutedAt?.valueOf(),
      swapExecutedBlockIndex: swap?.swapExecutedBlockIndex,
    };

    logger.info('sending response for swap request', { uuid, response });

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
    const { uuid } = await prisma.swapDepositChannel.create({
      data: {
        ...payload,
        depositAddress,
        ...blockInfo,
      },
    });

    res.json({ id: uuid, depositAddress, issuedBlock: blockInfo.issuedBlock });
  }),
);

export default router;
