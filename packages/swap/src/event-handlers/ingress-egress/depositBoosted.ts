import { assethubIngressEgressDepositBoosted as assethubSchema11200 } from '@chainflip/processor/11200/assethubIngressEgress/depositBoosted';
import { bitcoinIngressEgressDepositBoosted as bitcoinSchema11200 } from '@chainflip/processor/11200/bitcoinIngressEgress/depositBoosted';
import { arbitrumIngressEgressDepositBoosted as arbitrumSchema210 } from '@chainflip/processor/210/arbitrumIngressEgress/depositBoosted';
import { ethereumIngressEgressDepositBoosted as ethereumSchema210 } from '@chainflip/processor/210/ethereumIngressEgress/depositBoosted';
import { solanaIngressEgressDepositBoosted as solanaSchema210 } from '@chainflip/processor/210/solanaIngressEgress/depositBoosted';
import { tronIngressEgressDepositBoosted as tronSchema220 } from '@chainflip/processor/220/tronIngressEgress/depositBoosted';
import { ChainflipChain } from '@chainflip/utils/chainflip';
import { z } from 'zod';
import { ONE_IN_PIP } from '@/shared/functions.js';
import { Prisma, SwapFeeType } from '../../client.js';
import { getDepositTxRef } from '../common.js';
import { EventHandlerArgs } from '../index.js';

const arbitrumSchema = arbitrumSchema210.strict().transform((args) => ({
  ...args,
  depositDetails: { chain: 'Arbitrum' as const, data: args.depositDetails },
}));
const bitcoinSchema = bitcoinSchema11200.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Bitcoin' as const, data: args.depositDetails },
}));
const ethereumSchema = ethereumSchema210.strict().transform((args) => ({
  ...args,
  depositDetails: { chain: 'Ethereum' as const, data: args.depositDetails },
}));
const solanaSchema = solanaSchema210.strict().transform((args) => ({
  ...args,
  depositDetails: { chain: 'Solana' as const, data: args.depositDetails },
}));
const assethubSchema = assethubSchema11200.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Assethub' as const, data: args.depositDetails },
}));
const tronSchema = tronSchema220.transform((args) => ({
  ...args,
  depositDetails: { chain: 'Tron' as const, data: args.depositDetails },
}));

const schemas = {
  Arbitrum: arbitrumSchema,
  Bitcoin: bitcoinSchema,
  Ethereum: ethereumSchema,
  Solana: solanaSchema,
  Assethub: assethubSchema,
  Tron: tronSchema,
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
