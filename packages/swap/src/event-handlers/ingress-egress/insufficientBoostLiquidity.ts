import { arbitrumIngressEgressInsufficientBoostLiquidity as arbitrumSchema180 } from '@chainflip/processor/180/arbitrumIngressEgress/insufficientBoostLiquidity';
import { bitcoinIngressEgressInsufficientBoostLiquidity as bitcoinSchema180 } from '@chainflip/processor/180/bitcoinIngressEgress/insufficientBoostLiquidity';
import { ethereumIngressEgressInsufficientBoostLiquidity as ethereumSchema180 } from '@chainflip/processor/180/ethereumIngressEgress/insufficientBoostLiquidity';
import { polkadotIngressEgressInsufficientBoostLiquidity as polkadotSchema180 } from '@chainflip/processor/180/polkadotIngressEgress/insufficientBoostLiquidity';
import { solanaIngressEgressInsufficientBoostLiquidity as solanaSchema180 } from '@chainflip/processor/180/solanaIngressEgress/insufficientBoostLiquidity';
import { assethubIngressEgressInsufficientBoostLiquidity as assethubSchema190 } from '@chainflip/processor/190/assethubIngressEgress/insufficientBoostLiquidity';
import { arbitrumIngressEgressInsufficientBoostLiquidity as arbitrumSchema210 } from '@chainflip/processor/210/arbitrumIngressEgress/insufficientBoostLiquidity';
import { ethereumIngressEgressInsufficientBoostLiquidity as ethereumSchema210 } from '@chainflip/processor/210/ethereumIngressEgress/insufficientBoostLiquidity';
import { solanaIngressEgressInsufficientBoostLiquidity as solanaSchema210 } from '@chainflip/processor/210/solanaIngressEgress/insufficientBoostLiquidity';
import { assetConstants } from '@chainflip/utils/chainflip';
import assert from 'assert';
import z from 'zod';
import { Chain } from '../../client.js';
import { EventHandlerArgs } from '../index.js';

const schemas = {
  Arbitrum: z.union([arbitrumSchema210.strict(), arbitrumSchema180.strict()]),
  Bitcoin: bitcoinSchema180,
  Ethereum: z.union([ethereumSchema210.strict(), ethereumSchema180.strict()]),
  Polkadot: polkadotSchema180,
  Solana: z.union([solanaSchema210.strict(), solanaSchema180.strict()]),
  Assethub: assethubSchema190,
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
      if (depositChannel.type !== 'SWAP') {
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
