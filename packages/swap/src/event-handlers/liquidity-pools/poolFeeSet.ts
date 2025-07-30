import { liquidityPoolsPoolFeeSet as schema190 } from '@chainflip/processor/190/liquidityPools/poolFeeSet';
import type { EventHandlerArgs } from '../index.js';

const eventArgs = schema190;

export default async function poolFeeSet({ prisma, event }: EventHandlerArgs): Promise<void> {
  const { baseAsset, quoteAsset, feeHundredthPips } = eventArgs.parse(event.args);

  await prisma.pool.update({
    where: {
      baseAsset_quoteAsset: {
        baseAsset,
        quoteAsset,
      },
    },
    data: {
      liquidityFeeHundredthPips: Number(feeHundredthPips),
    },
  });
}
