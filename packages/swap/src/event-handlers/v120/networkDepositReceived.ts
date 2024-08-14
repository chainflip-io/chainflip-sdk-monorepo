import { reverseBytes } from '@chainflip/utils/bytes';
import assert from 'assert';
import { z } from 'zod';
import { assetConstants, Chain } from '@/shared/enums';
import { assertUnreachable } from '@/shared/functions';
import { u128, internalAssetEnum, actionSchema, hexString } from '@/shared/parsers';
import logger from '../../utils/logger';
import { EventHandlerArgs } from '../index';

const polkadotDepositDetails = z.number();
const evmDepositDetails = z.object({ txHashes: z.array(hexString).nullish() });
const bitcoinDepositDetails = z.object({
  txId: hexString.transform((v) => reverseBytes(v.substring(2))),
});
const depositDetailsSchema = z.union([
  bitcoinDepositDetails,
  evmDepositDetails,
  polkadotDepositDetails,
]);

export const depositReceivedArgs = z.object({
  amount: u128,
  asset: internalAssetEnum,
  ingressFee: u128,
  action: actionSchema,
  // >= v1.5.0
  blockHeight: u128.optional(),
  // >= v1.5.0
  depositDetails: depositDetailsSchema.optional(),
});

export type DepositReceivedArgs = z.input<typeof depositReceivedArgs>;

const getTxRef = (
  chain: Chain,
  details: z.output<typeof depositDetailsSchema>,
  blockHeight?: bigint,
) => {
  if (details === undefined) {
    return undefined;
  }

  switch (chain) {
    case 'Arbitrum':
    case 'Ethereum':
      return (details as z.output<typeof evmDepositDetails>)?.txHashes?.at(0);
    case 'Bitcoin':
      return (details as z.output<typeof bitcoinDepositDetails>)?.txId;
    case 'Polkadot':
      return `${blockHeight}-${details as z.output<typeof polkadotDepositDetails>}`;
    case 'Solana':
      assert(details == null);
      return undefined;
    default:
      return assertUnreachable(chain);
  }
};

export const networkDepositReceived = async ({ prisma, event }: EventHandlerArgs) => {
  const { asset, amount, action, ingressFee, depositDetails, blockHeight } =
    depositReceivedArgs.parse(event.args);

  const txRef =
    depositDetails !== undefined
      ? getTxRef(assetConstants[asset].chain, depositDetails, blockHeight)
      : undefined;

  if (action.__kind === 'Swap' || action.__kind === 'CcmTransfer') {
    let swapId;
    if ('principalSwapId' in action && action.principalSwapId !== null) {
      swapId = action.principalSwapId;
    } else if ('gasSwapId' in action && action.gasSwapId !== null) {
      swapId = action.gasSwapId as bigint;
    } else if ('swapId' in action && action.swapId !== null) {
      swapId = action.swapId;
    }

    if (!swapId) {
      logger.warn('No swapId found in networkDepositReceived');
      return;
    }

    await prisma.swap.update({
      where: { nativeId: swapId },
      data: {
        depositAmount: amount.toString(),
        depositTransactionRef: txRef,
        fees: {
          create: { amount: ingressFee.toString(), type: 'INGRESS', asset },
        },
      },
    });
  } else if (action.__kind === 'BoostersCredited') {
    await prisma.swap.updateMany({
      data: { depositTransactionRef: txRef },
      where: { srcAsset: asset, prewitnessedDepositId: action.prewitnessedDepositId },
    });
  } else if (action.__kind === 'NoAction') {
    // this means the ccm transfer failed https://github.com/chainflip-io/chainflip-backend/pull/4442
    // currently not handled - we can do this at a later point
  }
};
