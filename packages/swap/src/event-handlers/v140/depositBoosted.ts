import { arbitrumIngressEgressDepositBoosted } from '@chainflip/processor/160/arbitrumIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted } from '@chainflip/processor/160/bitcoinIngressEgress/depositBoosted';
import { ethereumIngressEgressDepositBoosted } from '@chainflip/processor/160/ethereumIngressEgress/depositBoosted';
import { polkadotIngressEgressDepositBoosted } from '@chainflip/processor/160/polkadotIngressEgress/depositBoosted';
import { solanaIngressEgressDepositBoosted } from '@chainflip/processor/160/solanaIngressEgress/depositBoosted';
import { z } from 'zod';
import { assetConstants } from '@/shared/enums';
import { ONE_IN_PIP } from '@/shared/functions';
import { SwapFeeType } from '@/swap/client';
import { getDepositTxRef } from '@/swap/event-handlers/common';
import { EventHandlerArgs } from '..';

const normalizeSchema = <T>(obj: T) => ({
  ...obj,
  depositDetails: undefined,
  blockHeight: undefined,
});

const arbitrumSchema = arbitrumIngressEgressDepositBoosted;
const bitcoinSchema = bitcoinIngressEgressDepositBoosted;
const ethereumSchema = ethereumIngressEgressDepositBoosted;
const polkadotSchema = polkadotIngressEgressDepositBoosted;
const solanaSchema = solanaIngressEgressDepositBoosted.transform(normalizeSchema);

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
    depositDetails,
    blockHeight,
  } = depositBoostedSchema.parse(event.args);

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
