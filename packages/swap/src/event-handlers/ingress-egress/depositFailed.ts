import * as bitcoin from '@chainflip/bitcoin';
import { arbitrumIngressEgressDepositFailed } from '@chainflip/processor/180/arbitrumIngressEgress/depositFailed';
import { bitcoinIngressEgressDepositFailed } from '@chainflip/processor/180/bitcoinIngressEgress/depositFailed';
import { ethereumIngressEgressDepositFailed } from '@chainflip/processor/180/ethereumIngressEgress/depositFailed';
import { polkadotIngressEgressDepositFailed } from '@chainflip/processor/180/polkadotIngressEgress/depositFailed';
import { solanaIngressEgressDepositFailed } from '@chainflip/processor/180/solanaIngressEgress/depositFailed';
import { assethubIngressEgressDepositFailed } from '@chainflip/processor/190/assethubIngressEgress/depositFailed';
import * as base58 from '@chainflip/utils/base58';
import { hexToBytes } from '@chainflip/utils/bytes';
import { assetConstants } from '@chainflip/utils/chainflip';
import * as ss58 from '@chainflip/utils/ss58';
import assert from 'assert';
import { z } from 'zod';
import { assertUnreachable } from '@/shared/functions';
import { FailedSwapReason, type Chain } from '../../client';
import env from '../../config/env';
import logger from '../../utils/logger';
import { DepositDetailsData, getDepositTxRef } from '../common';
import type { EventHandlerArgs } from '../index';

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
  { __kind: 'DepositChannel' }
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

    if (details.__kind === 'DepositChannel') {
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
    } else {
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
