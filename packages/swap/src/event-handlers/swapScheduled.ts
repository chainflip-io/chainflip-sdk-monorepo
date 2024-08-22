// Set the column in the DB to the block timestamp and the deposit amount.
import { z } from 'zod';
import { internalAssetEnum, u128, u64, swapType as swapTypeSchema } from '@/shared/parsers';
import { encodedAddress } from './common';
import logger from '../utils/logger';
import type { EventHandlerArgs } from '.';

const depositChannelSwapOrigin = z.object({
  __kind: z.literal('DepositChannel'),
  channelId: u64,
  depositAddress: encodedAddress,
  depositBlockHeight: u64,
});

const vaultSwapOrigin = z.object({
  __kind: z.literal('Vault'),
  txHash: z.string(),
});

const swapScheduledArgs = z
  .object({
    swapId: u64,
    sourceAsset: internalAssetEnum,
    depositAmount: u128,
    destinationAsset: internalAssetEnum,
    destinationAddress: encodedAddress,
    origin: z.union([depositChannelSwapOrigin, vaultSwapOrigin]),
    swapType: swapTypeSchema,
    // < v1.4.0
    brokerCommission: u128.nullish(),
    // >= v1.4.0
    brokerFee: u128.nullish(),
  })
  .transform(({ brokerCommission, brokerFee, ...rest }) => ({
    ...rest,
    brokerFee: brokerFee ?? brokerCommission ?? 0n,
  }));

export type SwapScheduledEvent = z.input<typeof swapScheduledArgs>;

export default async function swapScheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const {
    swapId,
    sourceAsset,
    depositAmount,
    destinationAsset,
    destinationAddress,
    origin,
    swapType,
    brokerFee,
  } = swapScheduledArgs.parse(event.args);

  const newSwapData = {
    depositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
    depositAmount: depositAmount.toString(), // will be overwritten with value before fees in the networkDepositReceived handler
    swapInputAmount: (depositAmount - brokerFee).toString(),
    nativeId: swapId,
    depositReceivedAt: new Date(block.timestamp),
    swapScheduledAt: new Date(block.timestamp),
    swapScheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
    fees: brokerFee
      ? {
          create: {
            type: 'BROKER' as const,
            asset: sourceAsset,
            amount: brokerFee.toString(),
          },
        }
      : undefined,
  };

  if (origin.__kind === 'DepositChannel') {
    const depositAddress = origin.depositAddress.address;

    const channel = await prisma.swapDepositChannel.findFirst({
      where: {
        srcAsset: sourceAsset,
        depositAddress,
        srcChainExpiryBlock: { gte: origin.depositBlockHeight },
      },
      orderBy: { issuedBlock: 'desc' },
    });

    if (!channel) {
      logger.info(
        `SwapScheduled: SwapDepositChannel not found for depositAddress ${depositAddress}`,
      );
      return;
    }

    await prisma.swap.create({
      data: {
        type: swapType.type,
        swapDepositChannelId: channel.id,
        srcAsset: sourceAsset,
        destAsset: destinationAsset,
        destAddress: destinationAddress.address,
        ...newSwapData,
      },
    });
  } else if (origin.__kind === 'Vault') {
    await prisma.swap.create({
      data: {
        type: swapType.type,
        srcAsset: sourceAsset,
        destAsset: destinationAsset,
        destAddress: destinationAddress.address,
        depositTransactionRef: origin.txHash,
        ...newSwapData,
      },
    });
  }
}
