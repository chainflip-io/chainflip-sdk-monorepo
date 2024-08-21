import { swappingSwapScheduled as schema141 } from '@chainflip/processor/141/swapping/swapScheduled';
import { swappingSwapScheduled as schema150 } from '@chainflip/processor/150/swapping/swapScheduled';
import { swappingSwapScheduled as schema160 } from '@chainflip/processor/160/swapping/swapScheduled';
import { z } from 'zod';
import type { EventHandlerArgs } from '.';

const transformOldShape = ({
  swapId,
  depositAmount,
  swapType,
  ...rest
}: z.output<typeof schema141> | z.output<typeof schema150>) => ({
  swapId,
  swapRequestId: swapId,
  inputAmount: depositAmount,
  swapType: swapType.__kind,
  ...rest,
});

const swapScheduledArgs = z.union([
  schema160,
  schema150.transform(transformOldShape),
  schema141.transform(transformOldShape),
]);

export type SwapScheduledEvent = z.input<typeof swapScheduledArgs>;

const swapTypeMap = {
  CcmGas: 'GAS',
  CcmPrincipal: 'PRINCIPAL',
  Swap: 'SWAP',
  NetworkFee: 'NETWORK_FEE',
  IngressEgressFee: 'INGRESS_EGRESS_FEE',
} as const;

export default async function swapScheduled({
  prisma,
  block,
  event,
}: EventHandlerArgs): Promise<void> {
  const { swapId, swapRequestId, inputAmount, swapType, ...rest } = swapScheduledArgs.parse(
    event.args,
  );

  const swapRequest = await prisma.swapRequest.findUniqueOrThrow({
    where: { nativeId: swapRequestId },
  });

  await prisma.swap.create({
    data: {
      swapRequestId: swapRequest.id,
      swapInputAmount: inputAmount.toString(),
      srcAsset: swapRequest.srcAsset,
      destAsset: swapRequest.destAsset,
      nativeId: swapId,
      type: swapTypeMap[swapType],
      swapScheduledAt: new Date(block.timestamp),
      swapScheduledBlockIndex: `${block.height}-${event.indexInBlock}`,
      fees:
        'brokerFee' in rest && rest.brokerFee != null
          ? {
              create: {
                type: 'BROKER' as const,
                asset: swapRequest.srcAsset,
                amount: rest.brokerFee.toString(),
              },
            }
          : undefined,
    },
  });
}
