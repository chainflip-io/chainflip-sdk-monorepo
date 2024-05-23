import { z } from 'zod';
import { ONE_IN_PIP } from '@/shared/functions';
import { actionSchema, internalAssetEnum, number, u128 } from '@/shared/parsers';
import { EventHandlerArgs } from '..';

export const depositBoostedSchema = z.object({
  asset: internalAssetEnum,
  amounts: z.array(z.tuple([number, u128])),
  ingressFee: u128,
  boostFee: u128,
  action: actionSchema,
  // channelId: u128,
  // depositDetails: cfChainsBtcUtxoId,
  // prewitnessedDepositId: u128,
});

// DepositBoosted event is emitted instead of DepositReceived event in v140 due to boost
// We need to update the depositAmount and store the ingress fee just like we do in the DepositReceived event
export const depositBoosted = async ({ prisma, event }: EventHandlerArgs) => {
  const { asset, boostFee, action, ingressFee, amounts } = depositBoostedSchema.parse(event.args);

  if (action.__kind === 'Swap') {
    const depositAmount = amounts.reduce((acc, [, amount]) => acc + amount, BigInt(0));
    const effectiveBoostFeeBps = (boostFee * BigInt(ONE_IN_PIP)) / BigInt(depositAmount.toString());

    await prisma.swap.update({
      where: { nativeId: action.swapId },
      data: {
        effectiveBoostFeeBps: Number(effectiveBoostFeeBps),
        depositAmount: depositAmount.toString(),
        fees: {
          create: [
            {
              type: 'BOOST',
              asset,
              amount: boostFee.toString(),
            },
            { amount: ingressFee.toString(), type: 'INGRESS', asset },
          ],
        },
      },
    });
  }
};
