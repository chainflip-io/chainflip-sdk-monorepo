import { arbitrumIngressEgressDepositFinalised } from '@chainflip/processor/160/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised } from '@chainflip/processor/160/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised } from '@chainflip/processor/160/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised } from '@chainflip/processor/160/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised } from '@chainflip/processor/160/solanaIngressEgress/depositFinalised';
import z from 'zod';
import { assetConstants } from '@/shared/enums';
import { getDepositTxRef } from './common';
import { EventHandlerArgs } from '.';

const normalizeSchema = <T>(obj: T) => ({
  ...obj,
  depositDetails: undefined,
  blockHeight: undefined,
});

const arbitrumSchema = arbitrumIngressEgressDepositFinalised;
const bitcoinSchema = bitcoinIngressEgressDepositFinalised;
const ethereumSchema = ethereumIngressEgressDepositFinalised;
const polkadotSchema = polkadotIngressEgressDepositFinalised;
const solanaSchema = solanaIngressEgressDepositFinalised.transform(normalizeSchema);

const depositFinalisedSchema = z.union([
  solanaSchema,
  arbitrumSchema,
  bitcoinSchema,
  ethereumSchema,
  polkadotSchema,
]);

export const networkDepositFinalised = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { asset, amount, action, ingressFee, depositDetails, blockHeight } =
    depositFinalisedSchema.parse(event.args);

  const txRef = getDepositTxRef(assetConstants[asset].chain, depositDetails, blockHeight);

  if (action.__kind === 'Swap' || action.__kind === 'CcmTransfer') {
    const { swapRequestId } = action;

    await prisma.swapRequest.update({
      where: { nativeId: swapRequestId },
      data: {
        depositAmount: amount.toString(),
        depositFinalisedAt: new Date(block.timestamp),
        depositFinalisedBlockIndex: `${block.height}-${event.indexInBlock}`,
        depositTransactionRef: txRef,
        ccmDepositReceivedBlockIndex:
          // the dedicated ccm deposit received event is removed in 1.6
          action.__kind === 'CcmTransfer' ? `${block.height}-${event.indexInBlock}` : undefined,
        fees: {
          create: { amount: ingressFee.toString(), type: 'INGRESS', asset },
        },
      },
    });
  } else if (action.__kind === 'BoostersCredited') {
    await prisma.swapRequest.updateMany({
      data: { depositTransactionRef: txRef },
      where: { srcAsset: asset, prewitnessedDepositId: action.prewitnessedDepositId },
    });
  } else if (action.__kind === 'NoAction') {
    // this means the ccm transfer failed https://github.com/chainflip-io/chainflip-backend/pull/4442
    // currently not handled - we can do this at a later point
  }
};
