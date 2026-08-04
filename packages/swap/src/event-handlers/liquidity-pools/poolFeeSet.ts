import { liquidityPoolsPoolFeeSet as schema220 } from '@chainflip/processor/220/liquidityPools/poolFeeSet';
import { liquidityPoolsPoolFeeSet as schema230 } from '@chainflip/processor/230/liquidityPools/poolFeeSet';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const eventArgs = z.union([schema230.strict(), schema220.strict()]);

export type PoolFeeSetArgs = z.input<typeof eventArgs>;

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
