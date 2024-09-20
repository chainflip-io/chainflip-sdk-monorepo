import express from 'express';
import { getAssetAndChain } from '@/shared/enums';
import { getPriceFromPriceX128 } from '@/shared/functions';
import { assert } from '@/shared/guards';
import { getRequiredBlockConfirmations } from '@/swap/utils/rpc';
import {
  depositChannelInclude,
  getDepositInfo,
  getEgressStatusFields,
  getSwapFields,
  getSwapState,
  swapRequestInclude,
} from './utils';
import prisma, { Prisma, SwapFee } from '../../client';
import { readField } from '../../utils/function';
import logger from '../../utils/logger';
import ServiceError from '../../utils/ServiceError';
import {
  channelIdRegex,
  coerceChain,
  swapRequestId,
  txHashRegex,
  estimateSwapDuration,
} from '../../utils/swap';
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
          swapRequests: { include: swapRequestInclude, orderBy: { nativeId: 'desc' } },
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

    const swapEgress = swapRequest?.egress;
    const refundEgress = swapRequest?.refundEgress;
    const ignoredEgresses = swapRequest?.ignoredEgresses;

    const { state, swapEgressTrackerTxRef, refundEgressTrackerTxRef, pendingDeposit } =
      await getSwapState(failedSwap, ignoredEgresses, swapRequest, swapDepositChannel);

    const internalSrcAsset = readField(swapRequest, swapDepositChannel, failedSwap, 'srcAsset');
    const internalDestAsset = readField(swapRequest, swapDepositChannel, 'destAsset');
    assert(internalSrcAsset, 'srcAsset must be defined');

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

    const originalInputAmount = swapRequest?.swapInputAmount;

    const swaps = swapRequest?.swaps;

    const rolledSwaps = swapRequest?.swaps.reduce(
      (acc, curr) => {
        if (curr.swapExecutedAt) {
          acc.swappedOutputAmount = acc.swappedOutputAmount.plus(curr.swapOutputAmount ?? 0);
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
        swappedInputAmount: new Prisma.Decimal(0),
        executedChunks: 0,
        currentChunk: null as null | NonNullable<typeof swaps>[number],
        lastExecutedChunk: null as null | NonNullable<typeof swaps>[number],
        isDca: Boolean(
          swapDepositChannel?.chunkIntervalBlocks && swapDepositChannel.chunkIntervalBlocks > 1,
        ),
        fees: [] as SwapFee[],
      },
    );

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

    const showBoost = Boolean(
      swapDepositChannel?.maxBoostFeeBps && swapDepositChannel.maxBoostFeeBps > 0,
    );

    const [
      swapEgressFields,
      refundEgressFields,
      estimatedDurationSeconds,
      srcChainRequiredBlockConfirmations,
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
        refundEgress?.broadcast,
        ignoredEgresses,
        'REFUND',
        refundEgressTrackerTxRef,
      ),
      srcAsset && destAsset && estimateSwapDuration({ srcAsset, destAsset }),
      getRequiredBlockConfirmations(internalSrcAsset),
    ]);

    const showCcm = Boolean(swapDepositChannel?.ccmGasBudget || swapDepositChannel?.ccmMessage);
    const isVaultSwap = Boolean(swapRequest?.originType === 'VAULT');
    const showDepositchannel = !isVaultSwap;

    const response = {
      state,
      swapId: swapRequest?.nativeId.toString(),
      ...getAssetAndChain(internalSrcAsset, 'src'),
      ...(internalDestAsset && getAssetAndChain(internalDestAsset, 'dest')),
      destAddress: readField(swapRequest, swapDepositChannel, failedSwap, 'destAddress'),
      srcChainRequiredBlockConfirmations,
      estimatedDurationSeconds,
      ...(showDepositchannel &&
        swapDepositChannel && {
          depositChannel: {
            id: `${swapDepositChannel.issuedBlock}-${swapDepositChannel.srcChain}-${swapDepositChannel.channelId}`,
            createdAt: swapDepositChannel.createdAt.valueOf(),
            brokerCommissionBps: swapDepositChannel.brokerCommissionBps,
            depositAddress: swapDepositChannel.depositAddress,
            srcChainExpiryBlock: swapDepositChannel.srcChainExpiryBlock?.toString(),
            estimatedExpiryTime: swapDepositChannel.estimatedExpiryAt?.valueOf(),
            expectedDepositAmount: swapDepositChannel.expectedDepositAmount?.toFixed(),
            isExpired: swapDepositChannel.isExpired,
            openedThroughBackend: swapDepositChannel.openedThroughBackend,
            affiliateBrokers,
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
            dcaParams: swapDepositChannel.chunkIntervalBlocks
              ? {
                  numberOfChunks: swapDepositChannel?.numberOfChunks,
                  chunkIntervalBlocks: swapDepositChannel?.chunkIntervalBlocks,
                }
              : undefined,
          },
        }),
      ...getDepositInfo(swapRequest, failedSwap, pendingDeposit),
      ...(rolledSwaps && {
        swap: {
          originalInputAmount,
          remainingInputAmount: originalInputAmount
            ?.minus(rolledSwaps.swappedInputAmount)
            .toFixed(),
          swappedInputAmount: rolledSwaps.swappedInputAmount.toFixed(),
          swappedOutputAmount: rolledSwaps.swappedOutputAmount.toFixed(),
          ...(rolledSwaps?.isDca
            ? {
                dca: {
                  lastExecutedChunk:
                    rolledSwaps.lastExecutedChunk && getSwapFields(rolledSwaps.lastExecutedChunk),
                  currentChunk: rolledSwaps.currentChunk && getSwapFields(rolledSwaps.currentChunk),
                  executedChunks: rolledSwaps.executedChunks,
                  remainingChunks:
                    (swapDepositChannel?.numberOfChunks ?? 1) - rolledSwaps.executedChunks,
                },
              }
            : {
                ...((rolledSwaps.currentChunk || rolledSwaps.lastExecutedChunk) && {
                  regular: getSwapFields(
                    (rolledSwaps.currentChunk || rolledSwaps.lastExecutedChunk)!,
                  ),
                }),
              }),
          fees: aggregateFees,
        },
      }),
      ...(swapEgressFields && { swapEgress: { ...swapEgressFields } }),
      ...(refundEgressFields && { refundEgress: { ...refundEgressFields } }),
      ...(showCcm && { ccmParams }),
      ...(showBoost && {
        boost: {
          effectiveBoostFeeBps,
          maxBoostFeeBps: swapDepositChannel?.maxBoostFeeBps,
          boostedAt: swapRequest?.depositBoostedAt?.valueOf(),
          boostedBlockIndex: swapRequest?.depositBoostedBlockIndex ?? undefined,
          skippedAt: swapDepositChannel?.failedBoosts.at(0)?.failedAtTimestamp.valueOf(),
          skippedBlockIndex:
            swapDepositChannel?.failedBoosts.at(0)?.failedAtBlockIndex ?? undefined,
        },
      }),
    };

    logger.info('sending response for swap request', { id, response });

    res.json(response);
  }),
);

export default router;
