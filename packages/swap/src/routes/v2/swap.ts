import express from 'express';
import { getAssetAndChain } from '@/shared/enums';
import { assert } from '@/shared/guards';
import {
  getBeneficiaries,
  getCcmParams,
  getDcaParams,
  getDepositInfo,
  getEgressStatusFields,
  getFillOrKillParams,
  getLatestSwapForId,
  getRolledSwapsInitialData,
  getSwapFields,
  getSwapState,
} from './utils';
import { SwapFee } from '../../client';
import { readField } from '../../utils/function';
import { getLastChainTrackingUpdateTimestamp } from '../../utils/intercept';
import logger from '../../utils/logger';
import { getRequiredBlockConfirmations } from '../../utils/rpc';
import { estimateSwapDuration } from '../../utils/swap';
import { asyncHandler } from '../common';

const router = express.Router();

export enum StateV2 {
  Failed = 'FAILED',
  Completed = 'COMPLETED',
  Sent = 'SENT',
  Sending = 'SENDING',
  Swapping = 'SWAPPING',
  Receiving = 'RECEIVING',
  Waiting = 'WAITING',
}

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { swapRequest, failedSwap, swapDepositChannel, pendingVaultSwap } =
      await getLatestSwapForId(id);

    const { state, swapEgressTrackerTxRef, refundEgressTrackerTxRef, pendingDeposit } =
      await getSwapState(failedSwap, swapRequest, swapDepositChannel, pendingVaultSwap);

    const internalSrcAsset = readField(
      swapRequest,
      swapDepositChannel,
      failedSwap,
      pendingVaultSwap,
      'srcAsset',
    );
    assert(internalSrcAsset, 'srcAsset must be defined');

    const internalDestAsset = readField(
      swapRequest,
      swapDepositChannel,
      failedSwap,
      pendingVaultSwap,
      'destAsset',
    );
    const maxBoostFeeBps = readField(
      swapRequest,
      swapDepositChannel,
      pendingVaultSwap,
      'maxBoostFeeBps',
    );
    const showBoost = Boolean(maxBoostFeeBps);

    let effectiveBoostFeeBps;
    if (showBoost) {
      if (swapRequest) {
        effectiveBoostFeeBps = swapRequest.effectiveBoostFeeBps ?? undefined;
      } else if (swapDepositChannel?.failedBoosts.length) {
        effectiveBoostFeeBps = 0;
      }
    }

    const swaps = swapRequest?.swaps.filter((swap) => swap.type !== 'GAS');

    let originalInputAmount = swapRequest?.swapInputAmount;
    let rolledSwaps;

    if (swaps?.length) {
      rolledSwaps = swaps.reduce((acc, curr) => {
        if (curr.swapExecutedAt) {
          acc.swappedOutputAmount = acc.swappedOutputAmount.plus(curr.swapOutputAmount ?? 0);
          acc.swappedIntermediateAmount = acc.swappedIntermediateAmount.plus(
            curr.intermediateAmount ?? 0,
          );
          acc.swappedInputAmount = acc.swappedInputAmount.plus(curr.swapInputAmount);
          acc.lastExecutedChunk = curr;
          acc.executedChunks += 1;
          acc.fees = acc.fees.concat(...curr.fees);
        } else {
          acc.currentChunk = curr;
        }
        return acc;
      }, getRolledSwapsInitialData(swapDepositChannel));
    } else if (failedSwap) {
      rolledSwaps = getRolledSwapsInitialData(swapDepositChannel);
      originalInputAmount = failedSwap.depositAmount;
    }

    const aggregateFees = rolledSwaps?.fees
      .reduce((acc, curr) => {
        const { type, asset, amount } = curr;
        const index = acc.findIndex((fee) => fee.type === type && fee.asset === asset);

        if (index !== -1) {
          acc[index].amount = acc[index].amount.plus(amount);
        } else {
          acc.push(curr);
        }
        return acc;
      }, [] as SwapFee[])
      .concat(swapRequest?.fees ?? [])
      .map((fee) => ({
        type: fee.type,
        ...getAssetAndChain(fee.asset),
        amount: fee.amount.toFixed(),
      }));

    const [
      swapEgressFields,
      refundEgressFields,
      estimatedDurations,
      srcChainRequiredBlockConfirmations,
      lastStateChainUpdate,
    ] = await Promise.all([
      getEgressStatusFields(swapRequest, failedSwap, 'SWAP', swapEgressTrackerTxRef),
      getEgressStatusFields(swapRequest, failedSwap, 'REFUND', refundEgressTrackerTxRef),
      internalDestAsset &&
        estimateSwapDuration({ srcAsset: internalSrcAsset, destAsset: internalDestAsset }),
      getRequiredBlockConfirmations(internalSrcAsset),
      getLastChainTrackingUpdateTimestamp(),
    ]);

    const beneficiaries = getBeneficiaries(swapRequest, swapDepositChannel, pendingVaultSwap);
    const isVaultSwap = Boolean(swapRequest?.originType === 'VAULT');
    const showDepositchannel = !isVaultSwap;

    const response = {
      state,
      swapId: swapRequest?.nativeId.toString(),
      ...getAssetAndChain(internalSrcAsset, 'src'),
      ...(internalDestAsset && getAssetAndChain(internalDestAsset, 'dest')),
      destAddress: readField(
        swapRequest,
        swapDepositChannel,
        failedSwap,
        pendingVaultSwap,
        'destAddress',
      ),
      srcChainRequiredBlockConfirmations,
      estimatedDurationsSeconds: estimatedDurations?.durations,
      estimatedDurationSeconds: estimatedDurations?.total,
      brokers: beneficiaries?.map(({ account, commissionBps }) => ({ account, commissionBps })),
      fees: aggregateFees ?? [],
      ...(showDepositchannel &&
        swapDepositChannel && {
          depositChannel: {
            id: `${swapDepositChannel.issuedBlock}-${swapDepositChannel.srcChain}-${swapDepositChannel.channelId}`,
            createdAt: swapDepositChannel.createdAt.valueOf(),
            brokerCommissionBps:
              beneficiaries?.find(({ type }) => type === 'SUBMITTER')?.commissionBps ?? 0,
            depositAddress: swapDepositChannel.depositAddress,
            srcChainExpiryBlock: swapDepositChannel.srcChainExpiryBlock?.toString(),
            estimatedExpiryTime: swapDepositChannel.estimatedExpiryAt?.valueOf(),
            expectedDepositAmount: swapDepositChannel.expectedDepositAmount?.toFixed(),
            isExpired: swapDepositChannel.isExpired,
            openedThroughBackend: swapDepositChannel.openedThroughBackend,
            affiliateBrokers:
              beneficiaries
                ?.filter(({ type }) => type === 'AFFILIATE')
                .map(({ account, commissionBps }) => ({ account, commissionBps })) ?? [],
            fillOrKillParams: getFillOrKillParams(swapRequest, swapDepositChannel),
            dcaParams: getDcaParams(swapRequest, swapDepositChannel),
          },
        }),
      ...getDepositInfo(swapRequest, failedSwap, pendingDeposit, pendingVaultSwap),
      ...(rolledSwaps && {
        swap: {
          originalInputAmount: originalInputAmount?.toFixed(),
          remainingInputAmount: originalInputAmount
            ?.minus(rolledSwaps.swappedInputAmount)
            .toFixed(),
          swappedInputAmount: rolledSwaps.swappedInputAmount.toFixed(),
          swappedIntermediateAmount: rolledSwaps.swappedIntermediateAmount.toFixed(),
          swappedOutputAmount: rolledSwaps.swappedOutputAmount.toFixed(),
          ...(rolledSwaps?.isDca
            ? {
                dca: {
                  lastExecutedChunk:
                    rolledSwaps.lastExecutedChunk && getSwapFields(rolledSwaps.lastExecutedChunk),
                  currentChunk: rolledSwaps.currentChunk && getSwapFields(rolledSwaps.currentChunk),
                  executedChunks: rolledSwaps.executedChunks,
                  remainingChunks:
                    (swapDepositChannel?.dcaNumberOfChunks ?? 1) - rolledSwaps.executedChunks,
                },
              }
            : {
                ...((rolledSwaps.currentChunk || rolledSwaps.lastExecutedChunk) && {
                  regular: getSwapFields(
                    (rolledSwaps.currentChunk || rolledSwaps.lastExecutedChunk)!,
                  ),
                }),
              }),
        },
      }),
      ...(swapEgressFields && { swapEgress: { ...swapEgressFields } }),
      ...(refundEgressFields && { refundEgress: { ...refundEgressFields } }),
      ccmParams: getCcmParams(swapRequest, swapDepositChannel, pendingVaultSwap),
      fillOrKillParams: getFillOrKillParams(swapRequest, swapDepositChannel, pendingVaultSwap),
      dcaParams: getDcaParams(swapRequest, swapDepositChannel, pendingVaultSwap),
      ...(showBoost && {
        boost: {
          effectiveBoostFeeBps,
          maxBoostFeeBps,
          boostedAt: swapRequest?.depositBoostedAt?.valueOf(),
          boostedBlockIndex: swapRequest?.depositBoostedBlockIndex ?? undefined,
          skippedAt: swapDepositChannel?.failedBoosts.at(0)?.failedAtTimestamp.valueOf(),
          skippedBlockIndex:
            swapDepositChannel?.failedBoosts.at(0)?.failedAtBlockIndex ?? undefined,
        },
      }),
      lastStatechainUpdateAt: lastStateChainUpdate?.valueOf(),
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

export default router;
