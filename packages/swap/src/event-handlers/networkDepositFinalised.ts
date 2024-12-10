import { arbitrumIngressEgressDepositFinalised } from '@chainflip/processor/160/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema160 } from '@chainflip/processor/160/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised } from '@chainflip/processor/160/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised } from '@chainflip/processor/160/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised } from '@chainflip/processor/160/solanaIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema170 } from '@chainflip/processor/170/bitcoinIngressEgress/depositFinalised';
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

const arbitrumSchema = arbitrumIngressEgressDepositFinalised;
const bitcoinSchema = z.union([bitcoinSchema170, bitcoinSchema160]);
const ethereumSchema = ethereumIngressEgressDepositFinalised;
const polkadotSchema = polkadotIngressEgressDepositFinalised;
const solanaSchema = solanaIngressEgressDepositFinalised.transform((obj) => ({
  ...obj,
  depositAddress: base58.encode(hexToBytes(obj.depositAddress)),
  depositDetails: undefined,
}));

const depositFinalisedSchema = z.union([
  solanaSchema,
  arbitrumSchema,
  bitcoinSchema,
  ethereumSchema,
  polkadotSchema,
]);

export const networkDepositFinalised = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { asset, amount, action, ingressFee, depositDetails, blockHeight, depositAddress } =
    depositFinalisedSchema.parse(event.args);

  let txRef = getDepositTxRef(assetConstants[asset].chain, depositDetails, blockHeight);
  if (!txRef && assetConstants[asset].chain === 'Solana' && typeof depositAddress === 'string') {
    const tokenAddress =
      asset === 'SolUsdc' ? getTokenContractAddress('SolUsdc', env.CHAINFLIP_NETWORK) : null;

    try {
      txRef = await findSolanaDepositSignature(
        env.SOLANA_RPC_HTTP_URL,
        tokenAddress,
        depositAddress,
        amount,
        0,
        Number(blockHeight),
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
