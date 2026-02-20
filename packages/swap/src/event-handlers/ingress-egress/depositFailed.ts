import * as bitcoin from '@chainflip/bitcoin';
import { arbitrumIngressEgressDepositFailed as arbitrumSchema11200 } from '@chainflip/processor/11200/arbitrumIngressEgress/depositFailed';
import { assethubIngressEgressDepositFailed as assetHubSchema11200 } from '@chainflip/processor/11200/assethubIngressEgress/depositFailed';
import { bitcoinIngressEgressDepositFailed as bitcoinSchema11200 } from '@chainflip/processor/11200/bitcoinIngressEgress/depositFailed';
import { ethereumIngressEgressDepositFailed as ethereumSchema11200 } from '@chainflip/processor/11200/ethereumIngressEgress/depositFailed';
import { solanaIngressEgressDepositFailed as solanaSchema11200 } from '@chainflip/processor/11200/solanaIngressEgress/depositFailed';
import { arbitrumIngressEgressDepositFailed as arbitrumSchema210 } from '@chainflip/processor/210/arbitrumIngressEgress/depositFailed';
import { assethubIngressEgressDepositFailed as assetHubSchema210 } from '@chainflip/processor/210/assethubIngressEgress/depositFailed';
import { bitcoinIngressEgressDepositFailed as bitcoinSchema210 } from '@chainflip/processor/210/bitcoinIngressEgress/depositFailed';
import { ethereumIngressEgressDepositFailed as ethereumSchema210 } from '@chainflip/processor/210/ethereumIngressEgress/depositFailed';
import { solanaIngressEgressDepositFailed as solanaSchema210 } from '@chainflip/processor/210/solanaIngressEgress/depositFailed';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import { assetConstants, ChainflipChain, isLegacyChainflipAsset } from '@chainflip/utils/chainflip';
import * as ss58 from '@chainflip/utils/ss58';
import assert from 'assert';
import { z } from 'zod';
import { assertUnreachable } from '@/shared/functions.js';
import { FailedSwapReason } from '../../client.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import { DepositDetailsData, getDepositTxRef } from '../common.js';
import type { EventHandlerArgs } from '../index.js';

const argsMap = {
  Arbitrum: z.union([arbitrumSchema210.strict(), arbitrumSchema11200.strict()]),
  Bitcoin: z.union([bitcoinSchema210.strict(), bitcoinSchema11200.strict()]),
  Ethereum: z.union([ethereumSchema210.strict(), ethereumSchema11200.strict()]),
  Solana: z.union([solanaSchema210.strict(), solanaSchema11200.strict()]),
  Assethub: z.union([assetHubSchema210.strict(), assetHubSchema11200.strict()]),
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type DepositFailedArgsMap = {
  [C in ChainflipChain]: z.input<(typeof argsMap)[C]>;
};
export type DepositFailedArgs = z.input<(typeof argsMap)[ChainflipChain]>;
export type BitcoinDepositFailedArgs = z.input<typeof bitcoinSchema11200>;

type DepositWitness = Extract<
  z.output<(typeof argsMap)[ChainflipChain]>['details'],
  { __kind: `DepositFailedDepositChannelVariant${ChainflipChain}` }
>['depositWitness'];

type FailureReason = z.output<(typeof argsMap)[ChainflipChain]>['reason']['__kind'];

const extractDepositAddress = (depositWitness: DepositWitness) => {
  switch (depositWitness.asset) {
    case 'Btc':
      assert(
        depositWitness.depositAddress.__kind !== 'OtherSegwit',
        'unexpected deposit address kind',
      );
      return bitcoin.encodeAddress(
        depositWitness.depositAddress.value,
        depositWitness.depositAddress.__kind,
        env.CHAINFLIP_NETWORK,
      );
    case 'Eth':
    case 'ArbEth':
    case 'ArbUsdc':
    case 'ArbUsdt':
    case 'Flip':
    case 'Usdc':
    case 'Usdt':
    case 'Wbtc':
      return depositWitness.depositAddress;
    case 'HubDot':
    case 'HubUsdc':
    case 'HubUsdt':
      return ss58.encode({ data: depositWitness.depositAddress, ss58Format: 0 });
    case 'Sol':
    case 'SolUsdc':
    case 'SolUsdt':
      return base58.encode(hexToBytes(depositWitness.depositAddress));
    default:
      return assertUnreachable(depositWitness, 'unexpected asset');
  }
};

const reasonMap: Record<FailureReason, FailedSwapReason> = {
  BelowMinimumDeposit: 'BelowMinimumDeposit',
  DepositWitnessRejected: 'DepositWitnessRejected',
  NotEnoughToPayFees: 'NotEnoughToPayFees',
  TransactionRejectedByBroker: 'TransactionRejectedByBroker',
  Unrefundable: 'Unrefundable',
};

const depositFailed =
  (chain: ChainflipChain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { details, blockHeight, ...rest } = argsMap[chain].parse(event.args);
    const reason = reasonMap[rest.reason.__kind];
    let txRef;
    let swapDepositChannelId;
    let accountCreationDepositChannelId;
    let amount;
    let asset;
    let channelMetadata;
    let destinationAddress;
    let destinationAsset;
    let pendingTxRefInfo;

    switch (details.__kind) {
      case 'DepositFailedDepositChannelVariantArbitrum':
      case 'DepositFailedDepositChannelVariantBitcoin':
      case 'DepositFailedDepositChannelVariantEthereum':
      case 'DepositFailedDepositChannelVariantSolana':
      case 'DepositFailedDepositChannelVariantAssethub': {
        const depositAddress = extractDepositAddress(details.depositWitness);

        const channel = await prisma.depositChannel.findFirstOrThrow({
          where: { srcChain: chain, depositAddress },
          orderBy: { issuedBlock: 'desc' },
        });

        if (channel.type === 'ACCOUNT_CREATION') {
          ({ id: accountCreationDepositChannelId, asset } =
            await prisma.accountCreationDepositChannel.findFirstOrThrow({
              where: { issuedBlock: channel.issuedBlock, channelId: channel.channelId },
              orderBy: { issuedBlock: 'desc' },
            }));
        } else if (channel.type === 'SWAP') {
          ({
            id: swapDepositChannelId,
            srcAsset: asset,
            destAddress: destinationAddress,
            destAsset: destinationAsset,
          } = await prisma.swapDepositChannel.findFirstOrThrow({
            where: { issuedBlock: channel.issuedBlock, channelId: channel.channelId },
            orderBy: { issuedBlock: 'desc' },
          }));
        } else if (channel.type === 'LIQUIDITY') {
          logger.info('deposit failed for liquidity channel');
          return;
        } else {
          return assertUnreachable(channel.type, 'unexpected deposit channel type');
        }

        assert(!isLegacyChainflipAsset(asset), 'unexpected legacy asset');

        if ('depositDetails' in details.depositWitness) {
          txRef = getDepositTxRef(
            { chain, data: details.depositWitness.depositDetails } as DepositDetailsData,
            blockHeight,
          );
        }
        amount = details.depositWitness.amount;

        if (!txRef && assetConstants[asset].chain === 'Solana') {
          pendingTxRefInfo = { swapDepositChannelId, accountCreationDepositChannelId };
        }
        break;
      }
      case 'DepositFailedVaultVariantArbitrum':
      case 'DepositFailedVaultVariantBitcoin':
      case 'DepositFailedVaultVariantEthereum':
      case 'DepositFailedVaultVariantSolana':
      case 'DepositFailedVaultVariantAssethub':
        if (details.__kind !== 'DepositFailedVaultVariantSolana') {
          txRef = getDepositTxRef(
            { chain, data: details.vaultWitness.depositDetails } as DepositDetailsData,
            blockHeight,
          );
        } else {
          pendingTxRefInfo = {
            address: base58.encode(details.vaultWitness.txId[0]),
            slot: details.vaultWitness.txId[1],
            failedVaultSwapId: undefined as number | undefined,
          };
        }
        amount = details.vaultWitness.depositAmount;
        asset = details.vaultWitness.inputAsset;
        channelMetadata = details.vaultWitness.depositMetadata?.channelMetadata;
        destinationAddress = details.vaultWitness.destinationAddress.address;
        destinationAsset = details.vaultWitness.outputAsset;
        break;
      default:
        return assertUnreachable(details, 'unexpected details kind');
    }

    const failedSwap = await prisma.failedSwap.create({
      data: {
        reason,
        swapDepositChannelId,
        accountCreationDepositChannelId,
        srcChain: chain,
        srcAsset: asset,
        destAddress: destinationAddress,
        destChain: assetConstants[asset].chain,
        destAsset: destinationAsset,
        depositAmount: amount.toString(),
        failedAt: new Date(block.timestamp),
        failedBlockIndex: `${block.height}-${event.indexInBlock}`,
        depositTransactionRef: txRef,
        ccmMessage: channelMetadata?.message,
        ccmGasBudget: channelMetadata?.gasBudget?.toString(),
        ccmAdditionalData: channelMetadata?.ccmAdditionalData,
      },
    });

    if (pendingTxRefInfo) {
      if ('failedVaultSwapId' in pendingTxRefInfo) {
        pendingTxRefInfo = { ...pendingTxRefInfo, failedVaultSwapId: failedSwap.id };
      }
      await prisma.solanaPendingTxRef.create({ data: pendingTxRefInfo });
    }
  };

export default depositFailed;
