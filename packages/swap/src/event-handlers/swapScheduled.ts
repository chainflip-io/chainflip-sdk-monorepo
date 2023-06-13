// Set the column in the DB to the block timestamp and the deposit amount.
import assert from 'assert';
import { z } from 'zod';
import { stateChainAssetEnum, unsignedInteger } from '@/shared/parsers';
import logger from '../utils/logger';
import { encodedAddress, foreignChainAddress } from './common';
import type { EventHandlerArgs } from '.';

const baseArgsWithoutSource = z.object({
  swapId: unsignedInteger,
  depositAmount: unsignedInteger,
  destinationAsset: stateChainAssetEnum,
  destinationAddress: encodedAddress,
});

// TODO:0.9 remove this
const depositAssetArg = z
  .object({
    depositAsset: stateChainAssetEnum,
  })
  .transform(({ depositAsset }) => ({ sourceAsset: depositAsset }));

const sourceAssetArg = z.object({
  sourceAsset: stateChainAssetEnum,
});

const baseArgs = z.union([
  z.intersection(baseArgsWithoutSource, depositAssetArg),
  z.intersection(baseArgsWithoutSource, sourceAssetArg),
]);

const depositChannelOrigin = z.object({
  __kind: z.literal('DepositChannel'),
  // TODO 0.9: depositAddress is a "EncodedAddress" in 0.9: https://github.com/chainflip-io/chainflip-backend/pull/3394
  depositAddress: z.union([foreignChainAddress, encodedAddress]),
});

const vaultOrigin = z.object({
  __kind: z.literal('Vault'),
  txHash: z.string(),
});

const eventArgs = z.intersection(
  baseArgs,
  z.object({ origin: z.union([depositChannelOrigin, vaultOrigin]) }),
);

export type SwapScheduledEvent = z.input<typeof eventArgs>;

export default async function swapScheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  try {
    const { swapId, depositAmount, ...args } = eventArgs.parse(event.args);

    const newSwapData = {
      depositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
      depositAmount: depositAmount.toString(),
      nativeId: swapId,
      depositReceivedAt: new Date(block.timestamp),
    };

    if (args.origin.__kind === 'DepositChannel') {
      const depositAddress = args.origin.depositAddress.address;

      const channels = await prisma.swapDepositChannel.findMany({
        where: { depositAddress, expiryBlock: { gte: block.height } },
      });

      if (channels.length === 0) {
        logger.info(
          `SwapScheduled: SwapDepositChannel not found for depositAddress ${depositAddress}`,
        );
        return;
      }

      assert(
        channels.length === 1,
        `SwapScheduled: too many active swap intents found for depositAddress ${depositAddress}`,
      );

      const [{ srcAsset, destAddress, destAsset, id }] = channels;

      await prisma.swap.create({
        data: {
          swapDepositChannelId: id,
          srcAsset,
          destAsset,
          destAddress,
          ...newSwapData,
        },
      });
    } else if (args.origin.__kind === 'Vault') {
      await prisma.swap.create({
        data: {
          srcAsset: args.sourceAsset,
          destAsset: args.destinationAsset,
          destAddress: args.destinationAddress.address,
          ...newSwapData,
        },
      });
    }
  } catch (error) {
    logger.customError(
      'error in "SwapScheduled" handler',
      { alertCode: 'EventHandlerError' },
      { error, handler: 'SwapScheduled' },
    );
    throw error;
  }
}
