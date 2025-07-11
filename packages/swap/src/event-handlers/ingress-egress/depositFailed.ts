import * as bitcoin from '@chainflip/bitcoin';
import { arbitrumIngressEgressDepositFailed as arbitrumSchema11000 } from '@chainflip/processor/11000/arbitrumIngressEgress/depositFailed';
import { assethubIngressEgressDepositFailed as assetHubSchema11000 } from '@chainflip/processor/11000/assethubIngressEgress/depositFailed';
import { bitcoinIngressEgressDepositFailed as bitcoinSchema11000 } from '@chainflip/processor/11000/bitcoinIngressEgress/depositFailed';
import { ethereumIngressEgressDepositFailed as ethereumSchema11000 } from '@chainflip/processor/11000/ethereumIngressEgress/depositFailed';
import { polkadotIngressEgressDepositFailed as polkadotSchema11000 } from '@chainflip/processor/11000/polkadotIngressEgress/depositFailed';
import { solanaIngressEgressDepositFailed as solanaSchema11000 } from '@chainflip/processor/11000/solanaIngressEgress/depositFailed';
import { arbitrumIngressEgressDepositFailed as arbitrumSchema190 } from '@chainflip/processor/190/arbitrumIngressEgress/depositFailed';
import { assethubIngressEgressDepositFailed as assetHubSchema190 } from '@chainflip/processor/190/assethubIngressEgress/depositFailed';
import { bitcoinIngressEgressDepositFailed as bitcoinSchema190 } from '@chainflip/processor/190/bitcoinIngressEgress/depositFailed';
import { ethereumIngressEgressDepositFailed as ethereumSchema190 } from '@chainflip/processor/190/ethereumIngressEgress/depositFailed';
import { polkadotIngressEgressDepositFailed as polkadotSchema190 } from '@chainflip/processor/190/polkadotIngressEgress/depositFailed';
import { solanaIngressEgressDepositFailed as solanaSchema190 } from '@chainflip/processor/190/solanaIngressEgress/depositFailed';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import { assetConstants, ChainflipChain } from '@chainflip/utils/chainflip';
import * as ss58 from '@chainflip/utils/ss58';
import assert from 'assert';
import { z } from 'zod';
import { assertUnreachable } from '@/shared/functions.js';
import { FailedSwapReason, type Chain } from '../../client.js';
import env from '../../config/env.js';
import logger from '../../utils/logger.js';
import { DepositDetailsData, getDepositTxRef } from '../common.js';
import type { EventHandlerArgs } from '../index.js';

const argsMap = {
  Arbitrum: z.union([arbitrumSchema11000, arbitrumSchema190]),
  Bitcoin: z.union([bitcoinSchema11000, bitcoinSchema190]),
  Ethereum: z.union([ethereumSchema11000, ethereumSchema190]),
  Polkadot: z.union([polkadotSchema11000, polkadotSchema190]),
  Solana: z.union([solanaSchema11000, solanaSchema190]),
  Assethub: z.union([assetHubSchema11000, assetHubSchema190]),
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type DepositFailedArgsMap = {
  [C in Chain]: z.input<(typeof argsMap)[C]>;
};
export type DepositFailedArgs = z.input<(typeof argsMap)[Chain]>;
export type BitcoinDepositFailedArgs = z.input<typeof bitcoinSchema190>;

type DepositWitness = Extract<
  z.output<(typeof argsMap)[Chain]>['details'],
  { __kind: 'DepositChannel' | `DepositChannel${ChainflipChain}` }
>['depositWitness'];

type FailureReason = z.output<(typeof argsMap)[Chain]>['reason']['__kind'];

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
    case 'Flip':
    case 'Usdc':
    case 'Usdt':
      return depositWitness.depositAddress;
    case 'HubDot':
    case 'HubUsdc':
    case 'HubUsdt':
    case 'Dot':
      return ss58.encode({ data: depositWitness.depositAddress, ss58Format: 0 });
    case 'Sol':
    case 'SolUsdc':
      return base58.encode(hexToBytes(depositWitness.depositAddress));
    default:
      return assertUnreachable(depositWitness, 'unexpected asset');
  }
};

const reasonMap: Record<FailureReason, FailedSwapReason> = {
  BelowMinimumDeposit: 'BelowMinimumDeposit',
  CcmInvalidMetadata: 'InvalidMetadata',
  CcmUnsupportedForTargetChain: 'UnsupportedForTargetChain',
  DepositWitnessRejected: 'DepositWitnessRejected',
  InvalidBrokerFees: 'InvalidBrokerFees',
  InvalidDcaParameters: 'InvalidDcaParameters',
  InvalidDestinationAddress: 'InvalidDestinationAddress',
  InvalidRefundParameters: 'InvalidRefundParameters',
  NotEnoughToPayFees: 'NotEnoughToPayFees',
  TransactionRejectedByBroker: 'TransactionRejectedByBroker',
};

type DepositChannelDetailsVariant11000 = `DepositFailedDepositChannelVariant${ChainflipChain}`;
type VaultDetailsVariant11000 = `DepositFailedVaultVariant${ChainflipChain}`;
type DepositChannelDetailsVariant190 = `DepositChannel${ChainflipChain}`;
type VaultDetailsVariant190 = `Vault${ChainflipChain}`;

const getPostfixedVariant = <T extends 'vault' | 'depositChannel', V extends '190' | '11000'>(
  chain: ChainflipChain,
  variant: T,
  version: V = '190',
): T extends 'vault'
  ? V extends '190'
    ? VaultDetailsVariant190
    : VaultDetailsVariant11000
  : V extends '190'
    ? DepositChannelDetailsVariant190
    : DepositChannelDetailsVariant11000 => {
  if (variant === 'vault') {
    return version === '190' ? `Vault${chain}` : `DepositFailedVaultVariant${chain}`;
  }
  return version === '190'
    ? `DepositChannel${chain}`
    : `DepositFailedDepositChannelVariant${chain}`;
};

const depositFailed =
  (chain: Chain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const { details, blockHeight, ...rest } = argsMap[chain].parse(event.args);
    const reason = reasonMap[rest.reason.__kind];
    let txRef;
    let swapDepositChannelId;
    let amount;
    let asset;
    let channelMetadata;
    let destinationAddress;
    let destinationAsset;
    let pendingTxRefInfo;

    switch (details.__kind) {
      case getPostfixedVariant('Arbitrum', 'depositChannel', '190'):
      case getPostfixedVariant('Bitcoin', 'depositChannel', '190'):
      case getPostfixedVariant('Ethereum', 'depositChannel', '190'):
      case getPostfixedVariant('Polkadot', 'depositChannel', '190'):
      case getPostfixedVariant('Solana', 'depositChannel', '190'):
      case getPostfixedVariant('Assethub', 'depositChannel', '190'):
      case getPostfixedVariant('Arbitrum', 'depositChannel', '11000'):
      case getPostfixedVariant('Bitcoin', 'depositChannel', '11000'):
      case getPostfixedVariant('Ethereum', 'depositChannel', '11000'):
      case getPostfixedVariant('Polkadot', 'depositChannel', '11000'):
      case getPostfixedVariant('Solana', 'depositChannel', '11000'):
      case getPostfixedVariant('Assethub', 'depositChannel', '11000'): {
        const depositAddress = extractDepositAddress(details.depositWitness);

        const channel = await prisma.depositChannel.findFirstOrThrow({
          where: { srcChain: chain, depositAddress },
          orderBy: { issuedBlock: 'desc' },
        });

        if (!channel.isSwapping) {
          logger.info('deposit failed for non-swapping channel');
          return;
        }

        ({
          id: swapDepositChannelId,
          srcAsset: asset,
          destAddress: destinationAddress,
          destAsset: destinationAsset,
        } = await prisma.swapDepositChannel.findFirstOrThrow({
          where: { issuedBlock: channel.issuedBlock, channelId: channel.channelId },
          orderBy: { issuedBlock: 'desc' },
        }));

        if ('depositDetails' in details.depositWitness) {
          txRef = getDepositTxRef(
            { chain, data: details.depositWitness.depositDetails } as DepositDetailsData,
            blockHeight,
          );
        }
        amount = details.depositWitness.amount;

        if (!txRef && assetConstants[asset].chain === 'Solana') {
          pendingTxRefInfo = { swapDepositChannelId };
        }
        break;
      }
      case getPostfixedVariant('Arbitrum', 'vault', '190'):
      case getPostfixedVariant('Bitcoin', 'vault', '190'):
      case getPostfixedVariant('Ethereum', 'vault', '190'):
      case getPostfixedVariant('Polkadot', 'vault', '190'):
      case getPostfixedVariant('Solana', 'vault', '190'):
      case getPostfixedVariant('Assethub', 'vault', '190'):
      case getPostfixedVariant('Arbitrum', 'vault', '11000'):
      case getPostfixedVariant('Bitcoin', 'vault', '11000'):
      case getPostfixedVariant('Ethereum', 'vault', '11000'):
      case getPostfixedVariant('Polkadot', 'vault', '11000'):
      case getPostfixedVariant('Solana', 'vault', '11000'):
      case getPostfixedVariant('Assethub', 'vault', '11000'):
        if ('depositDetails' in details.vaultWitness) {
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
