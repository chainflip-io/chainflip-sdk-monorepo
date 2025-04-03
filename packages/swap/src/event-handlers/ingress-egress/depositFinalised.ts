import { arbitrumIngressEgressDepositFinalised as arbitrumSchema180 } from '@chainflip/processor/180/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema180 } from '@chainflip/processor/180/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised as ethereumSchema180 } from '@chainflip/processor/180/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised as polkadotSchema180 } from '@chainflip/processor/180/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema180 } from '@chainflip/processor/180/solanaIngressEgress/depositFinalised';
import { assethubIngressEgressDepositFinalised as assethubSchema190 } from '@chainflip/processor/190/assethubIngressEgress/depositFinalised';
import { assetConstants, ChainflipChain } from '@chainflip/utils/chainflip';
import z from 'zod';
import { EventHandlerArgs } from '..';
import { getDepositTxRef } from '../common';

const arbitrumSchema = arbitrumSchema180;
const bitcoinSchema = bitcoinSchema180;
const ethereumSchema = ethereumSchema180;
const polkadotSchema = polkadotSchema180;
const solanaSchema = solanaSchema180;

const depositFinalisedSchema = {
  Solana: solanaSchema,
  Arbitrum: arbitrumSchema,
  Bitcoin: bitcoinSchema,
  Ethereum: ethereumSchema,
  Polkadot: polkadotSchema,
  Assethub: assethubSchema190,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type DepositFinalisedArgsMap = {
  [C in ChainflipChain]: z.input<(typeof depositFinalisedSchema)[C]>;
};

export const depositFinalised =
  (chain: ChainflipChain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { asset, amount, action, ingressFee, blockHeight, depositAddress, ...rest } =
      depositFinalisedSchema[chain].parse(event.args);
    const depositDetails = 'depositDetails' in rest ? rest.depositDetails : undefined;
    const maxBoostFeeBps = 'maxBoostFeeBps' in rest ? rest.maxBoostFeeBps : undefined;

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
          fees: {
            create: { amount: ingressFee.toString(), type: 'INGRESS', asset },
          },
          maxBoostFeeBps,
        },
      });
    } else if (action.__kind === 'BoostersCredited') {
      await prisma.swapRequest.updateMany({
        data: {
          depositFinalisedAt: new Date(block.timestamp),
          depositFinalisedBlockIndex: `${block.height}-${event.indexInBlock}`,
          depositTransactionRef: txRef,
        },
        where: { srcAsset: asset, prewitnessedDepositId: action.prewitnessedDepositId },
      });
    }
  };
