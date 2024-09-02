import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import { internalAssetEnum, u128 } from '@/shared/parsers';
import { EventHandlerArgs } from '..';

export const insufficientBoostLiquiditySchema = z.object({
  prewitnessedDepositId: u128,
  asset: internalAssetEnum,
  amountAttempted: u128,
  channelId: u128,
});

export const insufficientBoostLiquidity = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { channelId, asset, amountAttempted } = insufficientBoostLiquiditySchema.parse(event.args);

  const depositChannel = await prisma.depositChannel.findFirst({
    where: { channelId, srcChain: assetConstants[asset].chain },
    orderBy: {
      issuedBlock: 'desc',
    },
  });

  if (!depositChannel) {
    throw new Error(
      `InsufficientBoostLiquidity: Deposit channel not found for asset ${asset} and channelId ${channelId}`,
    );
  }

  if (depositChannel.isSwapping) {
    const swapDepositChannel = await prisma.swapDepositChannel.findFirstOrThrow({
      where: { channelId, srcAsset: asset },
      orderBy: {
        issuedBlock: 'desc',
      },
    });

    await prisma.failedBoost.create({
      data: {
        amount: amountAttempted.toString(),
        failedAtTimestamp: new Date(block.timestamp),
        failedAtBlockIndex: `${block.height}-${event.indexInBlock}`,
        swapDepositChannel: {
          connect: {
            id: swapDepositChannel.id,
          },
        },
      },
    });
  }
};
