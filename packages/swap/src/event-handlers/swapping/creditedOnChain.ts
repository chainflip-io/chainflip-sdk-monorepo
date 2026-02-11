import { swappingCreditedOnChain as schema190 } from '@chainflip/processor/190/swapping/creditedOnChain';
import { swappingCreditedOnChain as schema210 } from '@chainflip/processor/210/swapping/creditedOnChain';
import { z } from 'zod';
import { EventHandlerArgs } from '../index.js';

const swappingCreditedOnChain = z.union([schema210.strict(), schema190.strict()]);

export type SwappingCreditedOnChainArgs = z.input<typeof swappingCreditedOnChain>;

export default async function creditedOnChain({ prisma, event }: EventHandlerArgs) {
  const { amount, swapRequestId } = swappingCreditedOnChain.parse(event.args);

  await prisma.swapRequest.update({
    where: { nativeId: swapRequestId },
    data: {
      onChainSwapInfo: {
        update: {
          outputAmount: amount.toString(),
        },
      },
    },
  });
}
