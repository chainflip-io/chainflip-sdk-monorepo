import { arbitrumIngressEgressDepositBoosted as arbitrumSchema180 } from '@chainflip/processor/180/arbitrumIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted as bitcoinSchema180 } from '@chainflip/processor/180/bitcoinIngressEgress/depositBoosted';
import { ethereumIngressEgressDepositBoosted as ethereumSchema180 } from '@chainflip/processor/180/ethereumIngressEgress/depositBoosted';
import { polkadotIngressEgressDepositBoosted as polkadotSchema180 } from '@chainflip/processor/180/polkadotIngressEgress/depositBoosted';
import { solanaIngressEgressDepositBoosted as solanaSchema180 } from '@chainflip/processor/180/solanaIngressEgress/depositBoosted';
import { assethubIngressEgressDepositBoosted as assethubSchema190 } from '@chainflip/processor/190/assethubIngressEgress/depositBoosted';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { ONE_IN_PIP } from '@/shared/functions';
import { SwapFeeType } from '../../client';
import { getDepositTxRef } from '../common';
import { EventHandlerArgs } from '../index';

const arbitrumSchema = arbitrumSchema180.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Arbitrum' as const, data: args.depositDetails },
}));
const bitcoinSchema = bitcoinSchema180.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Bitcoin' as const, data: args.depositDetails },
}));
const ethereumSchema = ethereumSchema180.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Ethereum' as const, data: args.depositDetails },
}));
const polkadotSchema = polkadotSchema180.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Polkadot' as const, data: args.depositDetails },
}));
const solanaSchema = solanaSchema180.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Solana' as const, data: undefined },
}));
const assethubSchema = assethubSchema190.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Assethub' as const, data: args.depositDetails },
}));

const schemas = {
  Arbitrum: arbitrumSchema,
  Bitcoin: bitcoinSchema,
  Ethereum: ethereumSchema,
  Polkadot: polkadotSchema,
  Solana: solanaSchema,
  Assethub: assethubSchema,
} as const satisfies Record<ChainflipChain, z.ZodTypeAny>;

export type DepositBoostedArgsMap = {
  [C in ChainflipChain]: z.input<(typeof schemas)[C]>;
};

// DepositBoosted event is emitted instead of DepositFinalised event in v140 due to boost
// We need to update the depositAmount and store the ingress fee just like we do in the DepositFinalised event
export const depositBoosted =
  (chain: ChainflipChain) =>
  async ({ prisma, event, block }: EventHandlerArgs) => {
    const {
      asset,
      boostFee,
      action,
      ingressFee,
      amounts,
      prewitnessedDepositId,
      blockHeight,
      depositDetails,
      maxBoostFeeBps,
    } = schemas[chain].parse(event.args);

    const txRef = getDepositTxRef(depositDetails, blockHeight);

    if (action.__kind === 'Swap' || action.__kind === 'CcmTransfer') {
      const depositAmount = amounts.reduce((acc, [, amount]) => acc + amount, BigInt(0));
      const effectiveBoostFeeBps =
        (boostFee * BigInt(ONE_IN_PIP)) / BigInt(depositAmount.toString());

      const fees = {
        create: [
          { type: SwapFeeType.BOOST, asset, amount: boostFee.toString() },
          { type: SwapFeeType.INGRESS, asset, amount: ingressFee.toString() },
        ],
      };

      const nativeId = action.swapRequestId;
      const data = {
        maxBoostFeeBps,
        effectiveBoostFeeBps: Number(effectiveBoostFeeBps),
        prewitnessedDepositId,
        depositTransactionRef: txRef,
        depositBoostedAt: new Date(block.timestamp),
        depositBoostedBlockIndex: `${block.height}-${event.indexInBlock}`,
        fees,
      };

      await prisma.swapRequest.update({ where: { nativeId }, data });
    }
  };
