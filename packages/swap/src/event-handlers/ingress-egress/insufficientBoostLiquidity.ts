import { arbitrumIngressEgressInsufficientBoostLiquidity } from '@chainflip/processor/180/arbitrumIngressEgress/insufficientBoostLiquidity';
import { bitcoinIngressEgressInsufficientBoostLiquidity } from '@chainflip/processor/180/bitcoinIngressEgress/insufficientBoostLiquidity';
import { ethereumIngressEgressInsufficientBoostLiquidity } from '@chainflip/processor/180/ethereumIngressEgress/insufficientBoostLiquidity';
import { polkadotIngressEgressInsufficientBoostLiquidity } from '@chainflip/processor/180/polkadotIngressEgress/insufficientBoostLiquidity';
import { solanaIngressEgressInsufficientBoostLiquidity } from '@chainflip/processor/180/solanaIngressEgress/insufficientBoostLiquidity';
import { assethubIngressEgressInsufficientBoostLiquidity } from '@chainflip/processor/190/assethubIngressEgress/insufficientBoostLiquidity';
import { assetConstants } from '@chainflip/utils/chainflip';
import assert from 'assert';
import z from 'zod';
import { EventHandlerArgs } from '..';
import { Chain } from '../../client';

const schemas = {
  Arbitrum: arbitrumIngressEgressInsufficientBoostLiquidity,
  Bitcoin: bitcoinIngressEgressInsufficientBoostLiquidity,
  Ethereum: ethereumIngressEgressInsufficientBoostLiquidity,
  Polkadot: polkadotIngressEgressInsufficientBoostLiquidity,
  Solana: solanaIngressEgressInsufficientBoostLiquidity,
  Assethub: assethubIngressEgressInsufficientBoostLiquidity,
} as const satisfies Record<Chain, z.ZodTypeAny>;

export type InsufficientBoostLiquidityArgsMap = {
  [C in Chain]: z.input<(typeof schemas)[C]>;
};

export const insufficientBoostLiquidity =
  (chain: Chain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { channelId, asset, amountAttempted, originType, prewitnessedDepositId } = schemas[
      chain
    ].parse(event.args);

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
