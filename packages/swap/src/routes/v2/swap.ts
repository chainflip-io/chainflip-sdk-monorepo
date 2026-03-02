import { anyInternalAssetToRpcAsset } from '@chainflip/utils/chainflip';
import express from 'express';
import { assert } from '@/shared/guards.js';
import {
  getBeneficiaries,
  getCcmParams,
  getDcaParams,
  getDepositChannelInfo,
  getDepositInfo,
  getEgressStatusFields,
  getFillOrKillParams,
  getLatestSwapForId,
  getRolledSwapsInitialData,
  getSwapFields,
  getSwapState,
  rollupFees,
} from './utils.js';
import { readField } from '../../utils/function.js';
import { getLastChainTrackingUpdateTimestamp } from '../../utils/intercept.js';
import logger from '../../utils/logger.js';
import { getRequiredBlockConfirmations } from '../../utils/rpc.js';
import { estimateSwapDuration } from '../../utils/swap.js';
import { asyncHandler } from '../common.js';

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

    const {
      swapRequest,
      failedSwap,
      swapDepositChannel,
      pendingVaultSwap,
      accountCreationDepositChannel,
    } = await getLatestSwapForId(id);

    const {
      state,
      swapEgressTrackerTxRef,
      refundEgressTrackerTxRef,
      fallbackEgressTrackerTxRef,
      pendingDeposit,
    } = await getSwapState(failedSwap, swapRequest, swapDepositChannel, pendingVaultSwap);

    const internalSrcAsset = readField(
      swapRequest,
      swapDepositChannel,
      failedSwap,
      pendingVaultSwap,
      accountCreationDepositChannel && { srcAsset: accountCreationDepositChannel.asset },
      'srcAsset',
    );
    assert(internalSrcAsset, 'srcAsset must be defined');

    const internalDestAsset = readField(
      swapRequest,
      swapDepositChannel,
      failedSwap,
      pendingVaultSwap,
      accountCreationDepositChannel && { destAsset: 'Flip' as const },
      'destAsset',
    );
    const maxBoostFeeBps = readField(
      swapRequest,
      swapDepositChannel,
      pendingVaultSwap,
      accountCreationDepositChannel,
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
          acc.previousChunk = acc.currentChunk;
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
      fallbackEgressFields,
      estimatedDurations,
      srcChainRequiredBlockConfirmations,
      lastStateChainUpdate,
    ] = await Promise.all([
      getEgressStatusFields(swapRequest, failedSwap, 'egress', swapEgressTrackerTxRef),
      getEgressStatusFields(swapRequest, failedSwap, 'refundEgress', refundEgressTrackerTxRef),
      getEgressStatusFields(swapRequest, null, 'fallbackEgress', fallbackEgressTrackerTxRef),
      internalDestAsset &&
        estimateSwapDuration({
          srcAsset: internalSrcAsset,
          destAsset: internalDestAsset,
          isExternal,
        }),
      isExternal ? getRequiredBlockConfirmations(internalSrcAsset) : undefined,
      getLastChainTrackingUpdateTimestamp(),
    ]);

    const beneficiaries = getBeneficiaries(
      swapRequest,
      swapDepositChannel,
      pendingVaultSwap,
      accountCreationDepositChannel,
    );
    const isVaultSwap = Boolean(swapRequest?.originType === 'VAULT');
    const showDepositchannel = !isVaultSwap;

    const response = {
      state,
      swapId: swapRequest?.nativeId.toString(),
      srcAsset: anyInternalAssetToRpcAsset[internalSrcAsset].asset,
      srcChain: anyInternalAssetToRpcAsset[internalSrcAsset].chain,
      ...(internalDestAsset && {
        destAsset: anyInternalAssetToRpcAsset[internalDestAsset].asset,
        destChain: anyInternalAssetToRpcAsset[internalDestAsset].chain,
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
        (swapDepositChannel || accountCreationDepositChannel) && {
          depositChannel: getDepositChannelInfo(swapDepositChannel, accountCreationDepositChannel),
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
          ...(swapRequest?.oraclePriceDeltaBps && {
            livePriceExecutionDeltaPercentage: swapRequest.oraclePriceDeltaBps.div(100).toNumber(),
          }),
          ...(swapRequest?.onChainSwapInfo && {
            onChain: {
              accountId: swapRequest.onChainSwapInfo.accountId,
              outputAmount: swapRequest.onChainSwapInfo.outputAmount?.toFixed(),
              refundAmount: swapRequest.onChainSwapInfo.refundAmount?.toFixed(),
            },
          }),
          ...(rolledSwaps?.isDca
            ? {
                dca: {
                  lastExecutedChunk:
                    rolledSwaps.lastExecutedChunk && getSwapFields(rolledSwaps.lastExecutedChunk),
                  // if we have a DCA swap with two scheduled chunks, we need to show the info from
                  // the chunk that was scheduled first
                  currentChunk: rolledSwaps.previousChunk
                    ? getSwapFields(rolledSwaps.previousChunk)
                    : rolledSwaps.currentChunk && getSwapFields(rolledSwaps.currentChunk),
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
      ...(fallbackEgressFields && { fallbackEgress: { ...fallbackEgressFields } }),
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
      ...(swapRequest?.liquidationSwapInfo && {
        liquidation: {
          accountId: swapRequest.liquidationSwapInfo.accountId,
          loanId: swapRequest.liquidationSwapInfo.loanId.toString(),
          outputAmount: swapRequest.swapOutputAmount?.toFixed(),
          refundAmount: swapRequest.liquidationSwapInfo.refundAmount?.toFixed(),
          completedAt: swapRequest.liquidationSwapInfo.completedAt?.valueOf(),
          abortedAt: swapRequest.liquidationSwapInfo.abortedAt?.valueOf(),
          completedAtBlockIndex: swapRequest.liquidationSwapInfo.completedAtBlockIndex ?? undefined,
          abortedAtBlockIndex: swapRequest.liquidationSwapInfo.abortedAtBlockIndex ?? undefined,
        },
      }),
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

export default router;
