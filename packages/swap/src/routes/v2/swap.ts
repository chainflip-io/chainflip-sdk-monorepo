import { internalAssetToRpcAsset } from '@chainflip/utils/chainflip';
import express from 'express';
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
  rollupFees,
} from './utils';
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
    const isExternal =
      swapRequest?.originType !== 'ON_CHAIN' && swapRequest?.originType !== 'INTERNAL';

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
          acc.fees = rollupFees(curr.fees, acc.fees);
        } else {
          acc.currentChunk = curr;
        }
        return acc;
      }, getRolledSwapsInitialData(swapRequest));
    } else if (failedSwap) {
      rolledSwaps = getRolledSwapsInitialData(swapRequest);
      originalInputAmount = failedSwap.depositAmount;
    }
    const aggregateFees = rollupFees(swapRequest?.fees ?? [], rolledSwaps?.fees ?? new Map())
      .values()
      .toArray();

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
        estimateSwapDuration({
          srcAsset: internalSrcAsset,
          destAsset: internalDestAsset,
          isExternal,
        }),
      isExternal ? getRequiredBlockConfirmations(internalSrcAsset) : undefined,
      getLastChainTrackingUpdateTimestamp(),
    ]);

    const beneficiaries = getBeneficiaries(swapRequest, swapDepositChannel, pendingVaultSwap);
    const isVaultSwap = Boolean(swapRequest?.originType === 'VAULT');
    const showDepositchannel = !isVaultSwap;

    const response = {
      state,
      swapId: swapRequest?.nativeId.toString(),
      srcAsset: internalAssetToRpcAsset[internalSrcAsset].asset,
      srcChain: internalAssetToRpcAsset[internalSrcAsset].chain,
      ...(internalDestAsset && {
        destAsset: internalAssetToRpcAsset[internalDestAsset].asset,
        destChain: internalAssetToRpcAsset[internalDestAsset].chain,
      }),
      destAddress: readField(
        swapRequest,
        swapDepositChannel,
        failedSwap,
        pendingVaultSwap,
        'destAddress',
      ),
      ...(isExternal && { srcChainRequiredBlockConfirmations }),
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
            dcaParams: getDcaParams(swapDepositChannel),
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
                    (swapRequest?.dcaNumberOfChunks ?? 1) - rolledSwaps.executedChunks,
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
      dcaParams: getDcaParams(swapRequest, pendingVaultSwap),
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
