import { z } from 'zod';
import { internalAssetEnum, u128 } from '@/shared/parsers';
import { EventHandlerArgs } from '..';

export const insufficientBoostLiquiditySchema = z.object({
  prewitnessedDepositId: u128,
  asset: internalAssetEnum,
  amountAttempted: u128,
  channelId: u128,
});

export const insufficientBoostLiquidity = async ({ prisma, event }: EventHandlerArgs) => {
  const { channelId, asset, amountAttempted } = insufficientBoostLiquiditySchema.parse(event.args);

  const channel = await prisma.swapDepositChannel.findFirstOrThrow({
    where: { channelId, srcAsset: asset },
  });

  await prisma.failedBoost.create({
    data: {
      amount: amountAttempted.toString(),
      swapDepositChannel: {
        connect: {
          id: channel.id,
        },
      },
    },
  });
};
