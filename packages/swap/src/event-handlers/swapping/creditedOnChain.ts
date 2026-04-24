import { swappingCreditedOnChain as schema220 } from '@chainflip/processor/220/swapping/creditedOnChain';
import { z } from 'zod';
import { EventHandlerArgs } from '../index.js';

const swappingCreditedOnChain = schema220.strict();

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
