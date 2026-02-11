import { arbitrumIngressEgressDepositFinalised as arbitrumSchema11200 } from '@chainflip/processor/11200/arbitrumIngressEgress/depositFinalised';
import { assethubIngressEgressDepositFinalised as assethubSchema11200 } from '@chainflip/processor/11200/assethubIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema11200 } from '@chainflip/processor/11200/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised as ethereumSchema11200 } from '@chainflip/processor/11200/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised as polkadotSchema11200 } from '@chainflip/processor/11200/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema11200 } from '@chainflip/processor/11200/solanaIngressEgress/depositFinalised';
import { arbitrumIngressEgressDepositFinalised as arbitrumSchema210 } from '@chainflip/processor/210/arbitrumIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised as ethereumSchema210 } from '@chainflip/processor/210/ethereumIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema210 } from '@chainflip/processor/210/solanaIngressEgress/depositFinalised';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import z from 'zod';
import { assertUnreachable } from '@/shared/functions.js';
import { assert, isNotNullish } from '@/shared/guards.js';
import logger from '../../utils/logger.js';
import { formatForeignChainAddress, getDepositTxRef } from '../common.js';
import { EventHandlerArgs } from '../index.js';

const arbitrumSchema = z
  .union([arbitrumSchema210.strict(), arbitrumSchema11200.strict()])
  .transform((args) => ({
    ...args,
    depositDetails: { chain: 'Arbitrum' as const, data: args.depositDetails },
    depositAddress:
      args.depositAddress &&
      formatForeignChainAddress({ __kind: 'Arb', value: args.depositAddress }),
  }));
const bitcoinSchema = bitcoinSchema11200.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Bitcoin' as const, data: args.depositDetails },
  depositAddress:
    args.depositAddress && formatForeignChainAddress({ __kind: 'Btc', value: args.depositAddress }),
}));
const ethereumSchema = z
  .union([ethereumSchema210.strict(), ethereumSchema11200.strict()])
  .transform((args) => ({
    ...args,
    depositDetails: { chain: 'Ethereum' as const, data: args.depositDetails },
    depositAddress:
      args.depositAddress &&
      formatForeignChainAddress({ __kind: 'Eth', value: args.depositAddress }),
  }));
const polkadotSchema = polkadotSchema11200.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Polkadot' as const, data: args.depositDetails },
  depositAddress:
    args.depositAddress && formatForeignChainAddress({ __kind: 'Dot', value: args.depositAddress }),
}));
const solanaSchema = z
  .union([solanaSchema210.strict(), solanaSchema11200.strict()])
  .transform((args) => ({
    ...args,
    depositDetails: { chain: 'Solana' as const, data: args.depositDetails },
    depositAddress:
      args.depositAddress &&
      formatForeignChainAddress({ __kind: 'Sol', value: args.depositAddress }),
  }));
const assethubSchema = assethubSchema11200.transform((args) => ({
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
      channelId,
    } = depositFinalisedSchema[chain].parse(event.args);

    const txRef = getDepositTxRef(depositDetails, blockHeight);

    const swapData = {
      depositAmount: amount.toString(),
      depositFinalisedAt: new Date(block.timestamp),
      depositFinalisedBlockIndex: `${block.height}-${event.indexInBlock}`,
      depositTransactionRef: txRef,
      fees: {
        create: { amount: ingressFee.toString(), type: 'INGRESS', asset },
      },
      maxBoostFeeBps,
    } as const;

    if (action.__kind === 'Swap' || action.__kind === 'CcmTransfer') {
      const { swapRequestId } = action;

      await prisma.swapRequest.update({ where: { nativeId: swapRequestId }, data: swapData });
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
          depositTransactionRef: txRef,
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
    } else if (action.__kind === 'Unrefundable') {
      const channel = isNotNullish(channelId)
        ? await prisma.depositChannel.findFirst({
            where: { channelId: Number(channelId), srcChain: chain },
            orderBy: { issuedBlock: 'desc' },
          })
        : null;

      let swapDepositChannel;
      let accountCreationDepositChannel;

      if (channel?.type === 'ACCOUNT_CREATION') {
        accountCreationDepositChannel = {
          connect: {
            issuedBlock_chain_channelId: {
              issuedBlock: channel.issuedBlock,
              chain: channel.srcChain,
              channelId: channel.channelId,
            },
          },
        } as const;
      } else if (channel?.type === 'SWAP') {
        swapDepositChannel = {
          connect: {
            issuedBlock_srcChain_channelId: {
              issuedBlock: channel.issuedBlock,
              srcChain: channel.srcChain,
              channelId: channel.channelId,
            },
          },
        } as const;
      }

      const fs = await prisma.failedSwap.create({
        data: {
          depositAmount: amount.toString(),
          srcAsset: asset,
          srcChain: chain,
          reason: 'Unrefundable',
          failedAt: new Date(block.timestamp),
          failedBlockIndex: `${block.height}-${event.indexInBlock}`,
          depositTransactionRef: txRef,
          swapDepositChannel,
          accountCreationDepositChannel,
        },
      });

      if (depositDetails.chain === 'Solana')
        if (chain === 'Solana' && depositAddress && blockHeight) {
          if (originType === 'Vault') {
            await prisma.solanaPendingTxRef.create({
              data: {
                failedVaultSwapId: fs.id,
                slot: blockHeight,
                address: depositAddress,
              },
            });
          } else if (originType === 'DepositChannel') {
            if (swapDepositChannel) {
              await prisma.solanaPendingTxRef.create({ data: { swapDepositChannel } });
            } else if (accountCreationDepositChannel) {
              await prisma.solanaPendingTxRef.create({ data: { accountCreationDepositChannel } });
            }
          } else {
            assertUnreachable(originType, 'unexpected origin type for unrefundable deposit');
          }
        } else {
          logger.warn('Solana pending tx ref missing deposit address or block height', {
            depositAddress,
            blockHeight,
          });
        }
    } else if (action.__kind === 'LiquidityProvision') {
      assert(depositAddress, 'missing deposit address for liquidity provision deposit finalised');

      const channel = await prisma.depositChannel.findFirstOrThrow({
        where: { depositAddress },
        orderBy: { issuedBlock: 'desc' },
      });

      if (channel.type !== 'ACCOUNT_CREATION') return;

      const accountChannel = await prisma.accountCreationDepositChannel.findUniqueOrThrow({
        where: {
          issuedBlock_chain_channelId: {
            issuedBlock: channel.issuedBlock,
            chain: channel.srcChain,
            channelId: channel.channelId,
          },
        },
        include: { swapRequests: { where: { depositTransactionRef: null } } },
      });

      if (accountChannel.swapRequests.length !== 1) {
        logger.warn(
          'unexpected number of swap requests for liquidity provision deposit finalised',
          {
            depositAddress,
            swapRequestCount: accountChannel.swapRequests.length,
            blockId: block.height,
            indexInBlock: event.indexInBlock,
          },
        );
        return;
      }

      await prisma.swapRequest.update({
        where: { id: accountChannel.swapRequests[0].id },
        data: swapData,
      });
    } else {
      return assertUnreachable(action, 'unexpected action kind');
    }
  };
