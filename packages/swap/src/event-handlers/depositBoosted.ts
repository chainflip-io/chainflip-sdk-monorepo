import { arbitrumIngressEgressDepositBoosted as arbitrumSchema160 } from '@chainflip/processor/160/arbitrumIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted as bitcoinSchema160 } from '@chainflip/processor/160/bitcoinIngressEgress/depositBoosted';
import { ethereumIngressEgressDepositBoosted as ethereumSchema160 } from '@chainflip/processor/160/ethereumIngressEgress/depositBoosted';
import { polkadotIngressEgressDepositBoosted as polkadotSchema160 } from '@chainflip/processor/160/polkadotIngressEgress/depositBoosted';
import { solanaIngressEgressDepositBoosted as solanaSchema160 } from '@chainflip/processor/160/solanaIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted as bitcoinSchema170 } from '@chainflip/processor/170/bitcoinIngressEgress/depositBoosted';
import { arbitrumIngressEgressDepositBoosted as arbitrumSchema180 } from '@chainflip/processor/180/arbitrumIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted as bitcoinSchema180 } from '@chainflip/processor/180/bitcoinIngressEgress/depositBoosted';
import { ethereumIngressEgressDepositBoosted as ethereumSchema180 } from '@chainflip/processor/180/ethereumIngressEgress/depositBoosted';
import { polkadotIngressEgressDepositBoosted as polkadotSchema180 } from '@chainflip/processor/180/polkadotIngressEgress/depositBoosted';
import { solanaIngressEgressDepositBoosted as solanaSchema180 } from '@chainflip/processor/180/solanaIngressEgress/depositBoosted';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import { ONE_IN_PIP } from '@/shared/functions';
import { SwapFeeType } from '@/swap/client';
import { getDepositTxRef } from '@/swap/event-handlers/common';
import { EventHandlerArgs } from '.';

const arbitrumSchema = z.union([arbitrumSchema160, arbitrumSchema180]);
const bitcoinSchema = z.union([bitcoinSchema160, bitcoinSchema170, bitcoinSchema180]);
const ethereumSchema = z.union([ethereumSchema160, ethereumSchema180]);
const polkadotSchema = z.union([polkadotSchema160, polkadotSchema180]);
const solanaSchema = z.union([solanaSchema160, solanaSchema180]);

const depositBoostedSchema = z.union([
  arbitrumSchema,
  bitcoinSchema,
  ethereumSchema,
  polkadotSchema,
  solanaSchema,
]);

export type DepositBoostedArgs = z.input<typeof depositBoostedSchema>;

// DepositBoosted event is emitted instead of DepositFinalised event in v140 due to boost
// We need to update the depositAmount and store the ingress fee just like we do in the DepositFinalised event
export const depositBoosted = async ({ prisma, event, block }: EventHandlerArgs) => {
  const {
    asset,
    boostFee,
    action,
    ingressFee,
    amounts,
    prewitnessedDepositId,
    blockHeight,
    ...rest
  } = depositBoostedSchema.parse(event.args);
  const depositDetails = 'depositDetails' in rest ? rest.depositDetails : undefined;
  const maxBoostFeeBps = 'maxBoostFeeBps' in rest ? rest.maxBoostFeeBps : undefined;

  const txRef = getDepositTxRef(assetConstants[asset].chain, depositDetails, blockHeight);

  if (action.__kind === 'Swap' || action.__kind === 'CcmTransfer') {
    const depositAmount = amounts.reduce((acc, [, amount]) => acc + amount, BigInt(0));
    const effectiveBoostFeeBps = (boostFee * BigInt(ONE_IN_PIP)) / BigInt(depositAmount.toString());

    const fees = {
      create: [
        { type: SwapFeeType.BOOST, asset, amount: boostFee.toString() },
        { type: SwapFeeType.INGRESS, asset, amount: ingressFee.toString() },
      ],
    };

    const nativeId = action.swapRequestId;
    const data = {
      maxBoostFeeBps,
      effectiveBoostFeeBps: Number(effectiveBoostFeeBps),
      prewitnessedDepositId,
      depositTransactionRef: txRef,
      depositBoostedAt: new Date(block.timestamp),
      depositBoostedBlockIndex: `${block.height}-${event.indexInBlock}`,
      fees,
    };

    await prisma.swapRequest.update({ where: { nativeId }, data });
  }
};
