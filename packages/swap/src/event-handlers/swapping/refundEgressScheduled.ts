import { swappingRefundEgressScheduled as schema11000 } from '@chainflip/processor/11000/swapping/refundEgressScheduled';
import { swappingRefundEgressScheduled as schema190 } from '@chainflip/processor/190/swapping/refundEgressScheduled';
import z from 'zod';
import { Prisma } from '../../client.js';
import type { EventHandlerArgs } from '../index.js';

type RefundEgressScheduledArgsType = {
  swapRequestId: bigint;
  asset:
    | 'Eth'
    | 'Flip'
    | 'Usdc'
    | 'Dot'
    | 'Btc'
    | 'ArbEth'
    | 'ArbUsdc'
    | 'Usdt'
    | 'Sol'
    | 'SolUsdc'
    | 'HubDot'
    | 'HubUsdt'
    | 'HubUsdc';
  amount: bigint;
  egressId: ['Ethereum' | 'Polkadot' | 'Bitcoin' | 'Arbitrum' | 'Solana' | 'Assethub', bigint];
  egressFee: [
    bigint,
    (
      | 'Eth'
      | 'Flip'
      | 'Usdc'
      | 'Dot'
      | 'Btc'
      | 'ArbEth'
      | 'ArbUsdc'
      | 'Usdt'
      | 'Sol'
      | 'SolUsdc'
      | 'HubDot'
      | 'HubUsdt'
      | 'HubUsdc'
    ),
  ];
};

const eventArgs = z.union([
  schema11000,
  schema190.transform((data): RefundEgressScheduledArgsType => {
    const { refundFee, ...rest } = data;
    return rest as RefundEgressScheduledArgsType;
  }),
]) as z.ZodType<RefundEgressScheduledArgsType>;

export type RefundEgressScheduledArgs = z.input<typeof eventArgs>;

export default async function refundEgressScheduled({
  prisma,
  event,
  block,
}: EventHandlerArgs): Promise<void> {
  const {
    swapRequestId,
    egressId: [chain, nativeId],
    egressFee: [egressFee, egressFeeAsset],
    amount: egressAmount,
    refundFee: protocolRefundFee,
  } = eventArgs.parse(event.args);

  // TODO: add test to cover both cases
  let refundFeeAmount: string | null = null;

  if (!protocolRefundFee) {
    const [aggregate, swapRequest] = await Promise.all([
      prisma.swap.aggregate({
        where: { swapRequest: { nativeId: swapRequestId }, swapExecutedBlockIndex: { not: null } },
        _sum: { swapInputAmount: true },
      }),
      prisma.swapRequest.findUniqueOrThrow({
        where: { nativeId: swapRequestId },
        include: { fees: { where: { type: 'INGRESS' } } },
      }),
    ]);

    const refundFee = swapRequest.swapInputAmount
      .minus(aggregate._sum.swapInputAmount ?? 0)
      .minus(egressAmount?.toString() ?? 0)
      .minus(egressFee?.toString() ?? 0)
      .minus(swapRequest.fees.reduce((acc, fee) => acc.plus(fee.amount), new Prisma.Decimal(0)));

    if (refundFee.gt(0)) {
      refundFeeAmount = refundFee.toFixed();
    }
  } else {
    refundFeeAmount = Number(protocolRefundFee).toFixed();
  }

  const fees = [
    {
      type: 'EGRESS' as const,
      asset: egressFeeAsset,
      amount: egressFee.toString(),
    },
    ...(refundFeeAmount
      ? [
          {
            type: 'REFUND' as const,
            asset: egressFeeAsset,
            amount: refundFeeAmount,
          },
        ]
      : []),
  ];

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      refundEgress: {
        create: {
          nativeId,
          chain,
          amount: egressAmount.toString(),
          scheduledAt: new Date(block.timestamp),
          scheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
        },
      },
      fees: {
        create: fees,
      },
    },
  });
}
