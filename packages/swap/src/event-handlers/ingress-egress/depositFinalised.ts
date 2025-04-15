import * as bitcoin from '@chainflip/bitcoin';
import { arbitrumIngressEgressDepositFinalised as arbitrumSchema180 } from '@chainflip/processor/180/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema180 } from '@chainflip/processor/180/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised as ethereumSchema180 } from '@chainflip/processor/180/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised as polkadotSchema180 } from '@chainflip/processor/180/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema180 } from '@chainflip/processor/180/solanaIngressEgress/depositFinalised';
import { arbitrumIngressEgressDepositFinalised as arbitrumSchema190 } from '@chainflip/processor/190/arbitrumIngressEgress/depositFinalised';
import { assethubIngressEgressDepositFinalised as assethubSchema190 } from '@chainflip/processor/190/assethubIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema190 } from '@chainflip/processor/190/bitcoinIngressEgress/depositFinalised';
import { cfChainsAddressForeignChainAddress } from '@chainflip/processor/190/common';
import { ethereumIngressEgressDepositFinalised as ethereumSchema190 } from '@chainflip/processor/190/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised as polkadotSchema190 } from '@chainflip/processor/190/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema190 } from '@chainflip/processor/190/solanaIngressEgress/depositFinalised';
import * as base58 from '@chainflip/utils/base58';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { POLKADOT_SS58_PREFIX } from '@chainflip/utils/consts';
import * as ss58 from '@chainflip/utils/ss58';
import z from 'zod';
import { assertUnreachable } from '@/shared/functions';
import { assert } from '@/shared/guards';
import { EventHandlerArgs } from '..';
import env from '../../config/env';
import logger from '../../utils/logger';
import { getDepositTxRef } from '../common';

const formatForeignChainAddress = (
  address: z.output<typeof cfChainsAddressForeignChainAddress>,
): string => {
  switch (address.__kind) {
    case 'Eth':
    case 'Arb':
      return address.value;
    case 'Sol':
      return base58.encode(address.value);
    case 'Hub':
    case 'Dot':
      return ss58.encode({ data: address.value, ss58Format: POLKADOT_SS58_PREFIX });
    case 'Btc':
      if (address.value.__kind === 'OtherSegwit') {
        throw new Error('OtherSegwit scriptPubKey not supported');
      }

      return bitcoin.encodeAddress(
        address.value.value,
        address.value.__kind,
        env.CHAINFLIP_NETWORK,
      );
    default:
      return assertUnreachable(address, 'unexpected address');
  }
};

const arbitrumSchema = z.union([arbitrumSchema190, arbitrumSchema180]).transform((args) => ({
  ...args,
  depositDetails: { chain: 'Arbitrum' as const, data: args.depositDetails },
  depositAddress:
    args.depositAddress && formatForeignChainAddress({ __kind: 'Arb', value: args.depositAddress }),
}));
const bitcoinSchema = z.union([bitcoinSchema190, bitcoinSchema180]).transform((args) => ({
  ...args,
  depositDetails: { chain: 'Bitcoin' as const, data: args.depositDetails },
  depositAddress:
    args.depositAddress && formatForeignChainAddress({ __kind: 'Btc', value: args.depositAddress }),
}));
const ethereumSchema = z.union([ethereumSchema190, ethereumSchema180]).transform((args) => ({
  ...args,
  depositDetails: { chain: 'Ethereum' as const, data: args.depositDetails },
  depositAddress:
    args.depositAddress && formatForeignChainAddress({ __kind: 'Eth', value: args.depositAddress }),
}));
const polkadotSchema = z.union([polkadotSchema190, polkadotSchema180]).transform((args) => ({
  ...args,
  depositDetails: { chain: 'Polkadot' as const, data: args.depositDetails },
  depositAddress:
    args.depositAddress && formatForeignChainAddress({ __kind: 'Dot', value: args.depositAddress }),
}));
const solanaSchema = z.union([solanaSchema190, solanaSchema180]).transform((args) => ({
  ...args,
  depositDetails: { chain: 'Solana' as const, data: undefined },
  depositAddress:
    args.depositAddress && formatForeignChainAddress({ __kind: 'Sol', value: args.depositAddress }),
}));
const assethubSchema = assethubSchema190.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Assethub' as const, data: args.depositDetails },
  depositAddress:
    args.depositAddress && formatForeignChainAddress({ __kind: 'Hub', value: args.depositAddress }),
}));

const depositFinalisedSchema = {
  Solana: solanaSchema,
  Arbitrum: arbitrumSchema,
  Bitcoin: bitcoinSchema,
  Ethereum: ethereumSchema,
  Polkadot: polkadotSchema,
  Assethub: assethubSchema,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type DepositFinalisedArgsMap = {
  [C in ChainflipChain]: z.input<(typeof depositFinalisedSchema)[C]>;
};

export const depositFinalised =
  (chain: ChainflipChain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const {
      asset,
      amount,
      action,
      ingressFee,
      blockHeight,
      maxBoostFeeBps,
      depositDetails,
      originType,
      depositAddress,
    } = depositFinalisedSchema[chain].parse(event.args);

    const txRef = getDepositTxRef(depositDetails, blockHeight);

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
    } else if (action.__kind === 'Refund') {
      assert(originType === 'Vault', 'unexpected origin type');

      const egressId = action.egressId ?? undefined;

      const fs = await prisma.failedSwap.create({
        data: {
          srcAsset: asset,
          srcChain: chain,
          reason: action.reason,
          depositAmount: amount.toString(),
          failedAt: new Date(block.timestamp),
          failedBlockIndex: `${block.height}-${event.indexInBlock}`,
          refundEgress: egressId && {
            connectOrCreate: {
              where: {
                nativeId_chain: { nativeId: egressId[1], chain: egressId[0] },
              },
              create: {
                nativeId: egressId[1],
                chain: egressId[0],
                amount: action.amount.toString(),
                scheduledAt: new Date(block.timestamp),
                scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
              },
            },
          },
        },
      });

      if (chain === 'Solana') {
        if (depositAddress && blockHeight) {
          await prisma.solanaPendingTxRef.create({
            data: {
              failedVaultSwapId: fs.id,
              slot: blockHeight,
              address: depositAddress,
            },
          });
        } else {
          logger.warn('Solana pending tx ref missing deposit address or block height', {
            depositAddress,
            blockHeight,
          });
        }
      }
    } else if (action.__kind !== 'LiquidityProvision') {
      return assertUnreachable(action, 'unexpected action kind');
    }
  };
