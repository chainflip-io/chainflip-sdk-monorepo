import { swappingSwapScheduled } from '@chainflip/processor/180/swapping/swapScheduled';
import { z } from 'zod';
import type { EventHandlerArgs } from '..';

export type SwapScheduledArgs = z.input<typeof swappingSwapScheduled>;

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
  const { swapId, swapRequestId, inputAmount, swapType } = swappingSwapScheduled.parse(event.args);

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
    },
  });
}
