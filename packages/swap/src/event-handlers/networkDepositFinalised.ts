import { arbitrumIngressEgressDepositFinalised as arbitrumSchema160 } from '@chainflip/processor/160/arbitrumIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised as ethereumSchema160 } from '@chainflip/processor/160/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised as polkadotSchema160 } from '@chainflip/processor/160/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema160 } from '@chainflip/processor/160/solanaIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema170 } from '@chainflip/processor/170/bitcoinIngressEgress/depositFinalised';
import { arbitrumIngressEgressDepositFinalised as arbitrumSchema180 } from '@chainflip/processor/180/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema180 } from '@chainflip/processor/180/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised as ethereumSchema180 } from '@chainflip/processor/180/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised as polkadotSchema180 } from '@chainflip/processor/180/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema180 } from '@chainflip/processor/180/solanaIngressEgress/depositFinalised';
import { findSolanaDepositSignature } from '@chainflip/solana';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import z from 'zod';
import { getTokenContractAddress } from '@/shared/contracts';
import { assetConstants } from '@/shared/enums';
import env from '@/swap/config/env';
import logger from '@/swap/utils/logger';
import { getDepositTxRef } from './common';
import { EventHandlerArgs } from '.';

const arbitrumSchema = z.union([arbitrumSchema180, arbitrumSchema160]);
const bitcoinSchema = z.union([bitcoinSchema180, bitcoinSchema170]);
const ethereumSchema = z.union([ethereumSchema180, ethereumSchema160]);
const polkadotSchema = z.union([polkadotSchema180, polkadotSchema160]);
const solanaSchema = z.union([solanaSchema180, solanaSchema160]).transform((obj) => ({
  ...obj,
  depositAddress: obj.depositAddress && base58.encode(hexToBytes(obj.depositAddress)),
}));

const depositFinalisedSchema = z.union([
  solanaSchema,
  arbitrumSchema,
  bitcoinSchema,
  ethereumSchema,
  polkadotSchema,
]);

export const networkDepositFinalised = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { asset, amount, action, ingressFee, blockHeight, depositAddress, ...rest } =
    depositFinalisedSchema.parse(event.args);
  const depositDetails = 'depositDetails' in rest ? rest.depositDetails : undefined;
  const maxBoostFeeBps = 'maxBoostFeeBps' in rest ? rest.maxBoostFeeBps : undefined;

  let txRef = getDepositTxRef(assetConstants[asset].chain, depositDetails, blockHeight);
  if (!txRef && assetConstants[asset].chain === 'Solana' && typeof depositAddress === 'string') {
    const tokenAddress =
      asset !== 'Sol' ? getTokenContractAddress(asset, env.CHAINFLIP_NETWORK) : null;

    // somehow the blockHeight on the event can be slightly lower than the slot of the actual deposit
    // https://linear.app/chainflip/issue/PRO-1893/look-into-solana-ingress-block-height
    const maxDepositSlot = Number(blockHeight) + 50;

    try {
      txRef = await findSolanaDepositSignature(
        env.SOLANA_RPC_HTTP_URL,
        tokenAddress,
        depositAddress,
        amount,
        0,
        maxDepositSlot,
      );
    } catch (e) {
      logger.error('error while finding solana deposit signature', { error: e });
    }
  }

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
  } else if (action.__kind === 'NoAction') {
    // this means the ccm transfer failed https://github.com/chainflip-io/chainflip-backend/pull/4442
    // currently not handled - we can do this at a later point
  }
};
