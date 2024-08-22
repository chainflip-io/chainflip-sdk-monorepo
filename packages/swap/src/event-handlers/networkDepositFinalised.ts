import { arbitrumIngressEgressDepositFinalised as arbitrumSchema150 } from '@chainflip/processor/150/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema150 } from '@chainflip/processor/150/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised as ethereumSchema150 } from '@chainflip/processor/150/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised as polkadotSchema150 } from '@chainflip/processor/150/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema150 } from '@chainflip/processor/150/solanaIngressEgress/depositFinalised';
import { arbitrumIngressEgressDepositFinalised as arbitrumSchema160 } from '@chainflip/processor/160/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised as bitcoinSchema160 } from '@chainflip/processor/160/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised as ethereumSchema160 } from '@chainflip/processor/160/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised as polkadotSchema160 } from '@chainflip/processor/160/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised as solanaSchema160 } from '@chainflip/processor/160/solanaIngressEgress/depositFinalised';
import assert from 'assert';
import z from 'zod';
import { assetConstants } from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import { formatTxHash, parseSpecNumber } from './common';
import { Chain } from '../client';
import logger from '../utils/logger';
import { EventHandlerArgs } from '.';

const normalizeSchemas = <T>(obj: T) => ({
  ...obj,
  depositDetails: undefined,
  blockHeight: undefined,
});

const solanaSchema = z.union([
  solanaSchema160.transform(normalizeSchemas),
  solanaSchema150.transform(normalizeSchemas),
]);
const arbitrumSchema = z.union([arbitrumSchema160, arbitrumSchema150]);
const bitcoinSchema = z.union([bitcoinSchema160, bitcoinSchema150]);
const ethereumSchema = z.union([ethereumSchema160, ethereumSchema150]);
const polkadotSchema = z.union([polkadotSchema160, polkadotSchema150]);

type EthereumDepositDetails = z.output<typeof ethereumSchema>['depositDetails'];
type ArbitrumDepositDetails = z.output<typeof arbitrumSchema>['depositDetails'];
type EvmDepositDetails = EthereumDepositDetails | ArbitrumDepositDetails;
type BitcoinDepositDetails = z.output<typeof bitcoinSchema>['depositDetails'];
type PolkadotDepositDetails = z.output<typeof polkadotSchema>['depositDetails'];
type SolanaDepositDetails = z.output<typeof solanaSchema>['depositDetails'];

const depositFinalisedSchema = z.union([
  solanaSchema,
  arbitrumSchema,
  bitcoinSchema,
  ethereumSchema,
  polkadotSchema,
]);

export type DepositFinalisedArgs = z.input<typeof depositFinalisedSchema>;

const getTxRef = (
  chain: Chain,
  details:
    | BitcoinDepositDetails
    | EvmDepositDetails
    | PolkadotDepositDetails
    | SolanaDepositDetails
    | undefined,
  blockHeight?: bigint | number,
) => {
  if (details === undefined) {
    return undefined;
  }

  switch (chain) {
    case 'Arbitrum':
    case 'Ethereum':
      return (details as EvmDepositDetails)?.txHashes?.at(0);
    case 'Bitcoin':
      return (details as BitcoinDepositDetails)?.txId;
    case 'Polkadot':
      return `${blockHeight}-${details as PolkadotDepositDetails}`;
    case 'Solana':
      assert(details == null);
      return undefined;
    default:
      return assertUnreachable(chain);
  }
};

export const networkDepositFinalised = async ({ prisma, event, block }: EventHandlerArgs) => {
  const { asset, amount, action, ingressFee, depositDetails, blockHeight } =
    depositFinalisedSchema.parse(event.args);

  const txRef =
    depositDetails !== undefined
      ? formatTxHash(asset, getTxRef(assetConstants[asset].chain, depositDetails, blockHeight))
      : undefined;

  if (action.__kind === 'Swap' || action.__kind === 'CcmTransfer') {
    let swapRequestId;
    // shouldn't be needed after 1.6 is on mainnet
    let gasSwapRequestId;
    if ('principalSwapId' in action && action.principalSwapId !== null) {
      swapRequestId = action.principalSwapId;
      gasSwapRequestId = action.gasSwapId;
    } else if ('gasSwapId' in action && action.gasSwapId !== null) {
      swapRequestId = action.gasSwapId;
    } else if ('swapId' in action && action.swapId !== null) {
      swapRequestId = action.swapId;
    } else if ('swapRequestId' in action && action.swapRequestId !== null) {
      swapRequestId = action.swapRequestId;
    }

    if (!swapRequestId) {
      logger.warn('No swapRequestId found in networkDepositReceived');
      return;
    }
    const spec = parseSpecNumber(block.specId);

    await Promise.all([
      prisma.swapRequest.update({
        where: { nativeId: swapRequestId },
        data: {
          depositAmount: amount.toString(),
          depositReceivedAt: new Date(block.timestamp),
          depositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
          depositTransactionRef: txRef,
          ccmDepositReceivedBlockIndex:
            // the dedicated ccm deposit received event is removed in 1.6
            spec >= 160 && action.__kind === 'CcmTransfer'
              ? `${block.height}-${event.indexInBlock}`
              : undefined,
          fees: {
            create: { amount: ingressFee.toString(), type: 'INGRESS', asset },
          },
        },
      }),
      gasSwapRequestId &&
        prisma.swapRequest.update({
          where: { nativeId: gasSwapRequestId },
          data: {
            depositReceivedAt: new Date(block.timestamp),
            depositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
          },
        }),
    ]);
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
