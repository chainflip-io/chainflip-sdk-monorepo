import { z } from 'zod';
import { u128, internalAssetEnum, hexString, u64 } from '@/shared/parsers';
import logger from '../../utils/logger';
import { EventHandlerArgs } from '../index';

export const actionSchema = z.union([
  z.object({ __kind: z.literal('Swap'), swapId: u64 }),
  z.object({ __kind: z.literal('LiquidityProvision'), lpAccount: hexString }),
  z.object({
    __kind: z.literal('CcmTransfer'),
    principalSwapId: u64.nullable().optional(),
    gasSwapId: u64.nullable().optional(),
  }),
  z.object({
    __kind: z.literal('NoAction'),
  }),
]);

export const depositReceivedArgs = z.object({
  amount: u128,
  asset: internalAssetEnum,
  ingressFee: u128,
  action: actionSchema,
});

export type DepositReceivedArgs = z.input<typeof depositReceivedArgs>;

export const networkDepositReceived = async ({
  prisma,
  event,
}: EventHandlerArgs) => {
  const { asset, amount, action, ingressFee } = depositReceivedArgs.parse(
    event.args,
  );

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
        fees: {
          create: { amount: ingressFee.toString(), type: 'INGRESS', asset },
        },
      },
    });
  } else if (action.__kind === 'NoAction') {
    // this means the ccm transfer failed https://github.com/chainflip-io/chainflip-backend/pull/4442
    // currently not handled - we can do this at a later point
  }
};
