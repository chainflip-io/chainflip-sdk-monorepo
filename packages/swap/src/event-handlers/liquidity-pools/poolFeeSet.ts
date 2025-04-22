import { liquidityPoolsPoolFeeSet as schema160 } from '@chainflip/processor/160/liquidityPools/poolFeeSet';
import { liquidityPoolsPoolFeeSet as schema190 } from '@chainflip/processor/190/liquidityPools/poolFeeSet';
import { z } from 'zod';
import type { EventHandlerArgs } from '../index.js';

const eventArgs = z.union([schema190, schema160]);

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
