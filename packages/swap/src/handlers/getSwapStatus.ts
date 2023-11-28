import assert from 'assert';
import { z } from 'zod';
import { assetChains } from '@/shared/enums';
import {
  swapState,
  depositChannelIdRegex,
  getSwapStatusSchema,
  swapIdRegex,
  txHashRegex,
} from '@/shared/schemas';
import { channelIdRegex } from '@/shared/strings';
import prisma, {
  Broadcast,
  Chain,
  Egress,
  Swap,
  SwapDepositChannel,
} from '../client';
import { getPendingDeposit } from '../deposit-tracking';
import logger from '../utils/logger';
import ServiceError from '../utils/ServiceError';

type SwapWithBroadcast = Swap & {
  egress:
    | (Egress & {
        broadcast: Broadcast | null;
      })
    | null;
};

// eslint-disable-next-line @typescript-eslint/ban-types
const readField = <A extends {}, B extends {}, K extends keyof A & keyof B>(
  a: A | null | undefined,
  b: B | null | undefined,
  key: K,
) => a?.[key] ?? b?.[key];

export default async function getSwapStatus(
  input: z.output<typeof getSwapStatusSchema>,
) {
  const { id } = input;

  let swap: SwapWithBroadcast | null | undefined;
  let swapDepositChannel:
    | (SwapDepositChannel & { swaps: SwapWithBroadcast[] })
    | null
    | undefined;

  if (depositChannelIdRegex.safeParse(id).success) {
    const { issuedBlock, srcChain, channelId } =
      channelIdRegex.exec(id)!.groups!; // eslint-disable-line @typescript-eslint/no-non-null-assertion

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
          include: { egress: { include: { broadcast: true } } },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!swapDepositChannel) {
      logger.info(`could not find swap request with id "${id}`);
      throw ServiceError.notFound();
    }

    swap = swapDepositChannel.swaps.at(0);
  } else if (swapIdRegex.safeParse(id).success) {
    swap = await prisma.swap.findUnique({
      where: { nativeId: BigInt(id) },
      include: { egress: { include: { broadcast: true } } },
    });
  } else if (txHashRegex.safeParse(id).success) {
    swap = await prisma.swap.findFirst({
      where: { txHash: id },
      include: { egress: { include: { broadcast: true } } },
      // just get the last one for now
      orderBy: { createdAt: 'desc' },
    });
  }

  ServiceError.assert(
    swapDepositChannel || swap,
    'notFound',
    'resource not found',
  );

  let state: z.infer<typeof swapState>;

  if (swap?.egress?.broadcast?.succeededAt) {
    assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
    state = swapState.enum.COMPLETE;
  } else if (swap?.egress?.broadcast?.abortedAt) {
    assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
    state = swapState.enum.BROADCAST_ABORTED;
  } else if (swap?.egress?.broadcast) {
    assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
    state = swapState.enum.BROADCAST_REQUESTED;
  } else if (swap?.egress) {
    assert(swap.swapExecutedAt, 'swapExecutedAt should not be null');
    state = swapState.enum.EGRESS_SCHEDULED;
  } else if (swap?.swapExecutedAt) {
    state = swapState.enum.SWAP_EXECUTED;
  } else if (swap?.depositReceivedAt) {
    state = swapState.enum.DEPOSIT_RECEIVED;
  } else {
    state = swapState.enum.AWAITING_DEPOSIT;
  }

  const srcAsset = readField(swap, swapDepositChannel, 'srcAsset');
  const destAsset = readField(swap, swapDepositChannel, 'destAsset');
  assert(srcAsset && destAsset, 'srcAsset and destAsset should be defined');

  let pendingDeposit;

  if (
    state === swapState.enum.AWAITING_DEPOSIT &&
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
    srcChain: assetChains[srcAsset],
    destChain: assetChains[destAsset],
    srcAsset,
    destAsset,
    destAddress: readField(swap, swapDepositChannel, 'destAddress'),
    depositChannelCreatedAt: swapDepositChannel?.createdAt.valueOf(),
    depositAddress: swapDepositChannel?.depositAddress,
    expectedDepositAmount: swapDepositChannel?.expectedDepositAmount.toString(),
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
    broadcastRequestedAt: swap?.egress?.broadcast?.requestedAt?.valueOf(),
    broadcastRequestedBlockIndex: swap?.egress?.broadcast?.requestedBlockIndex,
    broadcastAbortedAt: swap?.egress?.broadcast?.abortedAt?.valueOf(),
    broadcastAbortedBlockIndex: swap?.egress?.broadcast?.abortedBlockIndex,
    broadcastSucceededAt: swap?.egress?.broadcast?.succeededAt?.valueOf(),
    broadcastSucceededBlockIndex: swap?.egress?.broadcast?.succeededBlockIndex,
    depositChannelExpiryBlock: swapDepositChannel?.srcChainExpiryBlock,
    estimatedDepositChannelExpiryTime:
      swapDepositChannel?.estimatedExpiryAt?.valueOf(),
    isDepositChannelExpired: swapDepositChannel?.isExpired ?? false,
    ccmDepositReceivedBlockIndex: swap?.ccmDepositReceivedBlockIndex,
    ccmMetadata: swap?.ccmGasBudget && {
      gasBudget: swap.ccmGasBudget.toString(),
      message: swap?.ccmMessage,
    },
  };

  logger.info('sending response for swap request', { id, response });

  return response;
}
