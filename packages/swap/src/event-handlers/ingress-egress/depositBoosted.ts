import { arbitrumIngressEgressDepositBoosted as arbitrumSchema190 } from '@chainflip/processor/190/arbitrumIngressEgress/depositBoosted';
import { assethubIngressEgressDepositBoosted as assethubSchema190 } from '@chainflip/processor/190/assethubIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted as bitcoinSchema190 } from '@chainflip/processor/190/bitcoinIngressEgress/depositBoosted';
import { ethereumIngressEgressDepositBoosted as ethereumSchema190 } from '@chainflip/processor/190/ethereumIngressEgress/depositBoosted';
import { polkadotIngressEgressDepositBoosted as polkadotSchema190 } from '@chainflip/processor/190/polkadotIngressEgress/depositBoosted';
import { solanaIngressEgressDepositBoosted as solanaSchema190 } from '@chainflip/processor/190/solanaIngressEgress/depositBoosted';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { ONE_IN_PIP } from '@/shared/functions.js';
import { Prisma, SwapFeeType } from '../../client.js';
import { getDepositTxRef } from '../common.js';
import { EventHandlerArgs } from '../index.js';

const arbitrumSchema = arbitrumSchema190.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Arbitrum' as const, data: args.depositDetails },
}));
const bitcoinSchema = bitcoinSchema190.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Bitcoin' as const, data: args.depositDetails },
}));
const ethereumSchema = ethereumSchema190.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Ethereum' as const, data: args.depositDetails },
}));
const polkadotSchema = polkadotSchema190.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Polkadot' as const, data: args.depositDetails },
}));
const solanaSchema = solanaSchema190.transform((args) => ({
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
      const data: Prisma.SwapRequestUpdateInput = {
        maxBoostFeeBps,
        effectiveBoostFeeBps: Number(effectiveBoostFeeBps),
        prewitnessedDepositId,
        depositTransactionRef: txRef,
        depositBoostedAt: new Date(block.timestamp),
        depositBoostedBlockIndex: `${block.height}-${event.indexInBlock}`,
        fees,
        depositAmount: depositAmount.toString(),
      };

      await prisma.swapRequest.update({ where: { nativeId }, data });
    }
  };
