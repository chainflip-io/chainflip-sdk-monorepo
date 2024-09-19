import { arbitrumIngressEgressDepositFinalised } from '@chainflip/processor/160/arbitrumIngressEgress/depositFinalised';
import { bitcoinIngressEgressDepositFinalised } from '@chainflip/processor/160/bitcoinIngressEgress/depositFinalised';
import { ethereumIngressEgressDepositFinalised } from '@chainflip/processor/160/ethereumIngressEgress/depositFinalised';
import { polkadotIngressEgressDepositFinalised } from '@chainflip/processor/160/polkadotIngressEgress/depositFinalised';
import { solanaIngressEgressDepositFinalised } from '@chainflip/processor/160/solanaIngressEgress/depositFinalised';
import assert from 'assert';
import z from 'zod';
import { assetConstants } from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import { formatTxHash } from './common';
import { Chain } from '../client';
import { EventHandlerArgs } from '.';

const normalizeSchema = <T>(obj: T) => ({
  ...obj,
  depositDetails: undefined,
  blockHeight: undefined,
});

const arbitrumSchema = arbitrumIngressEgressDepositFinalised;
const bitcoinSchema = bitcoinIngressEgressDepositFinalised;
const ethereumSchema = ethereumIngressEgressDepositFinalised;
const polkadotSchema = polkadotIngressEgressDepositFinalised;
const solanaSchema = solanaIngressEgressDepositFinalised.transform(normalizeSchema);

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
    const { swapRequestId } = action;

    await prisma.swapRequest.update({
      where: { nativeId: swapRequestId },
      data: {
        depositAmount: amount.toString(),
        depositReceivedAt: new Date(block.timestamp),
        depositReceivedBlockIndex: `${block.height}-${event.indexInBlock}`,
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
      data: { depositTransactionRef: txRef },
      where: { srcAsset: asset, prewitnessedDepositId: action.prewitnessedDepositId },
    });
  } else if (action.__kind === 'NoAction') {
    // this means the ccm transfer failed https://github.com/chainflip-io/chainflip-backend/pull/4442
    // currently not handled - we can do this at a later point
  }
};
