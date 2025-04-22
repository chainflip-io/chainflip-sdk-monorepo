import * as bitcoin from '@chainflip/bitcoin';
import { arbitrumIngressEgressDepositFailed as arbitrumSchema180 } from '@chainflip/processor/180/arbitrumIngressEgress/depositFailed';
import { bitcoinIngressEgressDepositFailed as bitcoinSchema180 } from '@chainflip/processor/180/bitcoinIngressEgress/depositFailed';
import { ethereumIngressEgressDepositFailed as ethereumSchema180 } from '@chainflip/processor/180/ethereumIngressEgress/depositFailed';
import { polkadotIngressEgressDepositFailed as polkadotSchema180 } from '@chainflip/processor/180/polkadotIngressEgress/depositFailed';
import { solanaIngressEgressDepositFailed as solanaSchema180 } from '@chainflip/processor/180/solanaIngressEgress/depositFailed';
import { arbitrumIngressEgressDepositFailed as arbitrumSchema190 } from '@chainflip/processor/190/arbitrumIngressEgress/depositFailed';
import { assethubIngressEgressDepositFailed } from '@chainflip/processor/190/assethubIngressEgress/depositFailed';
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

const arbitrumIngressEgressDepositFailed = z.union([arbitrumSchema190, arbitrumSchema180]);
const bitcoinIngressEgressDepositFailed = z.union([bitcoinSchema190, bitcoinSchema180]);
const ethereumIngressEgressDepositFailed = z.union([ethereumSchema190, ethereumSchema180]);
const polkadotIngressEgressDepositFailed = z.union([polkadotSchema190, polkadotSchema180]);
const solanaIngressEgressDepositFailed = z.union([solanaSchema190, solanaSchema180]);

const argsMap = {
  Arbitrum: arbitrumIngressEgressDepositFailed,
  Bitcoin: bitcoinIngressEgressDepositFailed,
  Ethereum: ethereumIngressEgressDepositFailed,
  Polkadot: polkadotIngressEgressDepositFailed,
  Solana: solanaIngressEgressDepositFailed,
  Assethub: assethubIngressEgressDepositFailed,
} as const satisfies Record<Chain, z.ZodTypeAny>;

export type DepositFailedArgsMap = {
  [C in Chain]: z.input<(typeof argsMap)[C]>;
};
export type DepositFailedArgs = z.input<(typeof argsMap)[Chain]>;
export type BitcoinDepositFailedArgs = z.input<typeof bitcoinIngressEgressDepositFailed>;

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
      case 'DepositChannel':
      case 'DepositChannelArbitrum':
      case 'DepositChannelBitcoin':
      case 'DepositChannelEthereum':
      case 'DepositChannelPolkadot':
      case 'DepositChannelSolana':
      case 'DepositChannelAssethub': {
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
      case 'Vault':
      case 'VaultArbitrum':
      case 'VaultBitcoin':
      case 'VaultEthereum':
      case 'VaultPolkadot':
      case 'VaultSolana':
      case 'VaultAssethub':
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
