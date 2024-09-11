import express from 'express';
import { assetConstants, getAssetAndChain } from '@/shared/enums';
import { getPriceFromPriceX128 } from '@/shared/functions';
import { getRequiredBlockConfirmations } from '@/swap/utils/rpc';
import {
  depositChannelInclude,
  getDepositIgnoredFailedState,
  getEgressStatusFields,
  getSwapFields,
  getSwapState,
  swapRequestInclude,
} from './utils';
import prisma, { Prisma, SwapFee } from '../../client';
import { getPendingDeposit } from '../../ingress-egress-tracking';
import { readField } from '../../utils/function';
import logger from '../../utils/logger';
import ServiceError from '../../utils/ServiceError';
import {
  channelIdRegex,
  coerceChain,
  swapRequestId,
  txHashRegex,
  estimateSwapDuration,
  isEgressableSwap,
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
          swapRequests: { include: swapRequestInclude },
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

    const { state, swapEgressTrackerTxRef, refundEgressTrackerTxRef } = await getSwapState(
      failedSwap,
      ignoredEgresses,
      swapRequest,
    );

    const internalSrcAsset = readField(swapRequest, swapDepositChannel, failedSwap, 'srcAsset');
    const internalDestAsset = readField(swapRequest, swapDepositChannel, 'destAsset');

    let pendingDeposit;
    if (internalSrcAsset && state === StateV2.Receiving && swapDepositChannel?.depositAddress) {
      pendingDeposit = await getPendingDeposit(
        assetConstants[internalSrcAsset].chain,
        assetConstants[internalSrcAsset].asset,
        swapDepositChannel.depositAddress,
      );
    }

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

    const depositTransactionRef =
      swapRequest?.depositTransactionRef ??
      pendingDeposit?.transactionHash ??
      failedSwap?.depositTransactionRef ??
      undefined;

    const sortedSwaps = swapRequest?.swaps.filter(isEgressableSwap).sort((a, b) => {
      if (a.swapExecutedAt && b.swapExecutedAt) {
        return a.swapExecutedAt.valueOf() - b.swapExecutedAt.valueOf() ? 1 : -1;
      }
      return a.swapExecutedAt && !b.swapExecutedAt ? 1 : 0;
    });

    const rolledSwaps = sortedSwaps?.reduce(
      (acc, curr) => {
        if (curr.swapExecutedAt) {
          acc.totalOutputAmountSwapped = acc.totalOutputAmountSwapped.plus(
            curr.swapOutputAmount ?? 0,
          );
          acc.totalInputAmountSwapped = acc.totalInputAmountSwapped.plus(curr.swapInputAmount);
          acc.lastExecutedChunk = curr;
          acc.totalChunksExecuted += 1;
          acc.fees = acc.fees.concat(...curr.fees);
        }
        return acc;
      },
      {
        totalOutputAmountSwapped: new Prisma.Decimal(0),
        totalInputAmountSwapped: new Prisma.Decimal(0),
        totalChunksExecuted: 0,
        currentChunk: sortedSwaps[0],
        lastExecutedChunk: null as null | (typeof sortedSwaps)[number] | undefined,
        isDcaSwap: Boolean(
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
        } else acc.push(curr);
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
      internalSrcAsset && getRequiredBlockConfirmations(internalSrcAsset),
    ]);

    const showCcm = Boolean(swapDepositChannel?.ccmGasBudget || swapDepositChannel?.ccmMessage);
    const showRefund = swapDepositChannel?.fokRefundAddress;
    const showEgress = Object.keys(swapEgressFields).length !== 0;

    const response = {
      state,
      swapId: swapRequest?.nativeId.toString(),
      ...(internalSrcAsset && getAssetAndChain(internalSrcAsset, 'src')),
      ...(internalDestAsset && getAssetAndChain(internalDestAsset, 'dest')),
      destAddress: readField(swapRequest, swapDepositChannel, failedSwap, 'destAddress'),
      estimatedDurationSeconds,
      depositChannel: {
        createdAt: swapDepositChannel?.createdAt.valueOf(),
        brokerCommissionBps: swapDepositChannel?.brokerCommissionBps,
        depositAddress: swapDepositChannel?.depositAddress,
        srcChainExpiryBlock: swapDepositChannel?.srcChainExpiryBlock?.toString(),
        estimatedExpiryTime: swapDepositChannel?.estimatedExpiryAt?.valueOf(),
        expectedDepositAmount: swapDepositChannel?.expectedDepositAmount?.toFixed(),
        isExpired: swapDepositChannel?.isExpired,
        openedThroughBackend: swapDepositChannel?.openedThroughBackend,
        affiliateBrokers,
        srcChainRequiredBlockConfirmations,
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
        dcaParams: swapDepositChannel?.chunkIntervalBlocks
          ? {
              numberOfChunks: swapDepositChannel?.numberOfChunks,
              chunkIntervalBlocks: swapDepositChannel?.chunkIntervalBlocks,
            }
          : undefined,
      },
      deposit: {
        amount:
          readField(swapRequest, failedSwap, 'depositAmount')?.toFixed() ?? pendingDeposit?.amount,
        txRef: depositTransactionRef,
        txConfirmations: pendingDeposit?.transactionConfirmations,
        receivedAt: swapRequest?.depositReceivedAt?.valueOf(),
        receivedBlockIndex: swapRequest?.depositReceivedBlockIndex ?? undefined,
        ...(failedSwap && { failure: getDepositIgnoredFailedState(failedSwap) }),
      },
      swap: {
        ...rolledSwaps,
        totalInputAmountSwapped: rolledSwaps?.totalInputAmountSwapped.toFixed(),
        totalOutputAmountSwapped: rolledSwaps?.totalOutputAmountSwapped.toFixed(),
        lastExecutedChunk:
          rolledSwaps?.lastExecutedChunk && getSwapFields(rolledSwaps.lastExecutedChunk),
        currentChunk: rolledSwaps && getSwapFields(rolledSwaps.currentChunk),
        fees: aggregateFees,
        ...(showEgress && { egress: { ...swapEgressFields } }),
      },
      ...(showRefund && {
        refund: {
          ...refundEgressFields,
        },
      }),
      ...(showCcm && {
        ccm: {
          ...ccmParams,
          receivedBlockIndex: swapRequest?.ccmDepositReceivedBlockIndex ?? undefined,
        },
      }),
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
