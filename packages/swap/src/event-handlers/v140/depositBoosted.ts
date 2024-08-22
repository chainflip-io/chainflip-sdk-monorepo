import { arbitrumIngressEgressDepositBoosted as arbitrumSchema150 } from '@chainflip/processor/150/arbitrumIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted as bitcoinSchema150 } from '@chainflip/processor/150/bitcoinIngressEgress/depositBoosted';
import { ethereumIngressEgressDepositBoosted as ethereumSchema150 } from '@chainflip/processor/150/ethereumIngressEgress/depositBoosted';
import { polkadotIngressEgressDepositBoosted as polkadotSchema150 } from '@chainflip/processor/150/polkadotIngressEgress/depositBoosted';
import { solanaIngressEgressDepositBoosted as solanaSchema150 } from '@chainflip/processor/150/solanaIngressEgress/depositBoosted';
import { arbitrumIngressEgressDepositBoosted as arbitrumSchema160 } from '@chainflip/processor/160/arbitrumIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted as bitcoinSchema160 } from '@chainflip/processor/160/bitcoinIngressEgress/depositBoosted';
import { ethereumIngressEgressDepositBoosted as ethereumSchema160 } from '@chainflip/processor/160/ethereumIngressEgress/depositBoosted';
import { polkadotIngressEgressDepositBoosted as polkadotSchema160 } from '@chainflip/processor/160/polkadotIngressEgress/depositBoosted';
import { solanaIngressEgressDepositBoosted as solanaSchema160 } from '@chainflip/processor/160/solanaIngressEgress/depositBoosted';
import { z } from 'zod';
import { ONE_IN_PIP } from '@/shared/functions';
import { SwapFeeType } from '@/swap/client';
import { EventHandlerArgs } from '..';

const arbitrumSchema = z.union([arbitrumSchema160, arbitrumSchema150]);
const bitcoinSchema = z.union([bitcoinSchema160, bitcoinSchema150]);
const ethereumSchema = z.union([ethereumSchema160, ethereumSchema150]);
const polkadotSchema = z.union([polkadotSchema160, polkadotSchema150]);
const solanaSchema = z.union([solanaSchema160, solanaSchema150]);

const depositBoostedSchema = z.union([
  arbitrumSchema,
  bitcoinSchema,
  ethereumSchema,
  polkadotSchema,
  solanaSchema,
]);

// DepositBoosted event is emitted instead of DepositFinalised event in v140 due to boost
// We need to update the depositAmount and store the ingress fee just like we do in the DepositFinalised event
export const depositBoosted = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { asset, boostFee, action, ingressFee, amounts, prewitnessedDepositId } =
    depositBoostedSchema.parse(event.args);

  if (action.__kind === 'Swap') {
    const depositAmount = amounts.reduce((acc, [, amount]) => acc + amount, BigInt(0));
    const effectiveBoostFeeBps = (boostFee * BigInt(ONE_IN_PIP)) / BigInt(depositAmount.toString());

    let nativeId;
    let data;
    const fees = {
      create: [
        { type: SwapFeeType.BOOST, asset, amount: boostFee.toString() },
        { type: SwapFeeType.INGRESS, asset, amount: ingressFee.toString() },
      ],
    };

    if ('swapId' in action) {
      nativeId = action.swapId;
      data = {
        effectiveBoostFeeBps: Number(effectiveBoostFeeBps),
        prewitnessedDepositId,
        depositAmount: depositAmount.toString(),
        depositBoostedAt: new Date(block.timestamp),
        depositBoostedBlockIndex: `${block.height}-${event.indexInBlock}`,
        fees,
      };
    } else {
      nativeId = action.swapRequestId;
      data = {
        effectiveBoostFeeBps: Number(effectiveBoostFeeBps),
        prewitnessedDepositId,
        depositBoostedAt: new Date(block.timestamp),
        depositBoostedBlockIndex: `${block.height}-${event.indexInBlock}`,
        fees,
      };
    }

    await prisma.swapRequest.update({ where: { nativeId }, data });
  }
};
