// Set the column in the DB to the block timestamp and the deposit amount.
import { z } from 'zod';
import {
  chainflipAssetEnum,
  u128,
  u64,
  swapType as swapTypeSchema,
} from '@/shared/parsers';
import { encodedAddress } from './common';
import logger from '../utils/logger';
import type { EventHandlerArgs } from '.';

const depositChannelSwapOrigin = z.object({
  __kind: z.literal('DepositChannel'),
  channelId: u64,
  depositAddress: encodedAddress,
});
const vaultSwapOrigin = z.object({
  __kind: z.literal('Vault'),
  txHash: z.string(),
});

const swapScheduledArgs = z.object({
  swapId: u64,
  sourceAsset: chainflipAssetEnum,
  depositAmount: u128,
  destinationAsset: chainflipAssetEnum,
  destinationAddress: encodedAddress,
  origin: z.union([depositChannelSwapOrigin, vaultSwapOrigin]),
  swapType: swapTypeSchema,
});

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
  } = swapScheduledArgs.parse(event.args);

  const newSwapData = {
    depositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
    depositAmount: depositAmount.toString(),
    nativeId: swapId,
    depositReceivedAt: new Date(block.timestamp),
  };

  if (origin.__kind === 'DepositChannel') {
    const depositAddress = origin.depositAddress.address;

    const channel = await prisma.swapDepositChannel.findFirst({
      where: {
        srcAsset: sourceAsset,
        depositAddress,
        issuedBlock: { lte: block.height },
      },
      orderBy: { id: 'desc' },
    });
    if (!channel) {
      logger.info(
        `SwapScheduled: SwapDepositChannel not found for depositAddress ${depositAddress}`,
      );
      return;
    }

    const { srcAsset, destAddress, destAsset, id } = channel;

    await prisma.swap.create({
      data: {
        type: swapType.type,
        swapDepositChannelId: id,
        srcAsset,
        destAsset,
        destAddress,
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
        txHash: origin.txHash,
        ...newSwapData,
      },
    });
  }
}
