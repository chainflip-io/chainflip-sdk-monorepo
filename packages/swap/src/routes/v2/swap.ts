import express from 'express';
import { getAssetAndChain } from '@/shared/enums';
import { getPriceFromPriceX128 } from '@/shared/functions';
import { assert } from '@/shared/guards';
import { getLastChainTrackingUpdateTimestamp } from '@/swap/utils/intercept';
import { getRequiredBlockConfirmations } from '@/swap/utils/rpc';
import {
  getDcaParams,
  getDepositInfo,
  getEgressStatusFields,
  getLatestSwapForId,
  getSwapFields,
  getSwapState,
} from './utils';
import { Prisma, SwapFee } from '../../client';
import { readField } from '../../utils/function';
import logger from '../../utils/logger';
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

    const { swapRequest, failedSwap, swapDepositChannel, beneficiaries } =
      await getLatestSwapForId(id);

    const swapEgress = swapRequest?.egress;
    const refundEgress = swapRequest?.refundEgress;
    const ignoredEgresses = swapRequest?.ignoredEgresses;

    const { state, swapEgressTrackerTxRef, refundEgressTrackerTxRef, pendingDeposit } =
      await getSwapState(failedSwap, ignoredEgresses, swapRequest, swapDepositChannel);

    const internalSrcAsset = readField(swapRequest, swapDepositChannel, failedSwap, 'srcAsset');
    const internalDestAsset = readField(swapRequest, swapDepositChannel, 'destAsset');
    assert(internalSrcAsset, 'srcAsset must be defined');

    const ccmGasBudget = readField(swapRequest, swapDepositChannel, 'ccmGasBudget');
    const ccmMessage = readField(swapRequest, swapDepositChannel, 'ccmMessage');
    let ccmParams;
    if (ccmGasBudget || ccmMessage) {
      ccmParams = {
        gasBudget: ccmGasBudget?.toFixed(),
        message: ccmMessage,
      };
    }

    const showBoost = Boolean(swapRequest?.maxBoostFeeBps || swapDepositChannel?.maxBoostFeeBps);

    let effectiveBoostFeeBps;
    if (showBoost) {
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

    const originalInputAmount = swapRequest?.swapInputAmount;

    const swaps = swapRequest?.swaps.filter((swap) => swap.type !== 'GAS');

    const rolledSwaps = swaps?.length
      ? swaps.reduce(
          (acc, curr) => {
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
          },
          {
            swappedOutputAmount: new Prisma.Decimal(0),
            swappedIntermediateAmount: new Prisma.Decimal(0),
            swappedInputAmount: new Prisma.Decimal(0),
            executedChunks: 0,
            currentChunk: null as null | NonNullable<typeof swaps>[number],
            lastExecutedChunk: null as null | NonNullable<typeof swaps>[number],
            isDca: Boolean(
              swapDepositChannel?.dcaChunkIntervalBlocks &&
                swapDepositChannel.dcaChunkIntervalBlocks > 1,
            ),
            fees: [] as SwapFee[],
          },
        )
      : undefined;

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
      getEgressStatusFields(
        swapEgress,
        swapEgress?.broadcast,
        ignoredEgresses,
        'SWAP',
        swapEgressTrackerTxRef,
      ),
      getEgressStatusFields(
        refundEgress,
        refundEgress?.broadcast ?? failedSwap?.refundBroadcast,
        ignoredEgresses,
        'REFUND',
        refundEgressTrackerTxRef,
      ),
      srcAsset && destAsset && estimateSwapDuration({ srcAsset, destAsset }),
      getRequiredBlockConfirmations(internalSrcAsset),
      getLastChainTrackingUpdateTimestamp(),
    ]);

    const isVaultSwap = Boolean(swapRequest?.originType === 'VAULT');
    const showDepositchannel = !isVaultSwap;

    const response = {
      state,
      swapId: swapRequest?.nativeId.toString(),
      ...getAssetAndChain(internalSrcAsset, 'src'),
      ...(internalDestAsset && getAssetAndChain(internalDestAsset, 'dest')),
      destAddress: readField(swapRequest, swapDepositChannel, failedSwap, 'destAddress'),
      srcChainRequiredBlockConfirmations,
      estimatedDurationsSeconds: estimatedDurations?.durations,
      estimatedDurationSeconds: estimatedDurations?.total,
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
            fillOrKillParams: swapDepositChannel.fokMinPriceX128
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
            dcaParams: getDcaParams(swapRequest, swapDepositChannel),
          },
        }),
      ...getDepositInfo(swapRequest, failedSwap, pendingDeposit),
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
      ...(ccmParams && { ccmParams }),
      ...(showBoost && {
        boost: {
          effectiveBoostFeeBps,
          maxBoostFeeBps: swapRequest?.maxBoostFeeBps ?? swapDepositChannel?.maxBoostFeeBps,
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
