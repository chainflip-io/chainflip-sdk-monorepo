import { bitcoinIngressEgressInsufficientBoostLiquidity } from '@chainflip/processor/180/bitcoinIngressEgress/insufficientBoostLiquidity';
import { assetConstants } from '@chainflip/utils/chainflip';
import assert from 'assert';
import { EventHandlerArgs } from '..';

export const insufficientBoostLiquiditySchema = bitcoinIngressEgressInsufficientBoostLiquidity;

export const insufficientBoostLiquidity = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { channelId, asset, amountAttempted, originType, prewitnessedDepositId } =
    insufficientBoostLiquiditySchema.parse(event.args);

  let depositChannel;

  if (originType === 'DepositChannel') {
    assert(channelId != null, 'expected channel id for deposit channel origin');

    depositChannel = await prisma.depositChannel.findFirst({
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

    // dont store skipped boosts for lp deposits
    if (!depositChannel.isSwapping) {
      return;
    }
  }

  const swapDepositChannel =
    depositChannel &&
    (await prisma.swapDepositChannel.findFirstOrThrow({
      where: { channelId: depositChannel.channelId, srcAsset: asset },
      orderBy: {
        issuedBlock: 'desc',
      },
    }));

  await prisma.failedBoost.create({
    data: {
      prewitnessedDepositId,
      asset,
      amount: amountAttempted.toString(),
      failedAtTimestamp: new Date(block.timestamp),
      failedAtBlockIndex: `${block.height}-${event.indexInBlock}`,
      swapDepositChannel: swapDepositChannel
        ? {
            connect: {
              id: swapDepositChannel.id,
            },
          }
        : undefined,
    },
  });
};
